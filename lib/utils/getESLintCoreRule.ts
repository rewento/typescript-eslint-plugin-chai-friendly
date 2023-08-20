import { ESLintUtils } from '@typescript-eslint/utils';
import { version } from 'eslint/package.json';
import * as semver from 'semver';

const isESLintV8 = semver.major(version) >= 8;

interface RuleMap {
  'no-unused-expressions': typeof import('eslint/lib/rules/no-unused-expressions');
}

type RuleId = keyof RuleMap;

export const getESLintCoreRule: <R extends RuleId>(ruleId: R) => RuleMap[R] =
  isESLintV8
    ? <R extends RuleId>(ruleId: R): RuleMap[R] =>
        ESLintUtils.nullThrows(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          require('eslint/use-at-your-own-risk').builtinRules.get(
            ruleId,
          ) as RuleMap[R],
          `ESLint's core rule '${ruleId}' not found.`,
        )
    : <R extends RuleId>(ruleId: R): RuleMap[R] =>
        require(`eslint/lib/rules/${ruleId}`) as RuleMap[R];

export function maybeGetESLintCoreRule<R extends RuleId>(
  ruleId: R,
): RuleMap[R] | null {
  try {
    return getESLintCoreRule<R>(ruleId);
  } catch {
    return null;
  }
}
