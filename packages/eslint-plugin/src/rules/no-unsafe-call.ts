import type { TSESTree } from '@typescript-eslint/utils';
import * as tsutils from 'ts-api-utils';

import * as util from '../util';
import { getThisExpression } from '../util';

type MessageIds =
  | 'unsafeCall'
  | 'unsafeCallThis'
  | 'unsafeNew'
  | 'unsafeTemplateTag';

export default util.createRule<[], MessageIds>({
  name: 'no-unsafe-call',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow calling a value with type `any`',
      recommended: 'recommended',
      requiresTypeChecking: true,
    },
    messages: {
      unsafeCall: 'Unsafe call of an `any` typed value.',
      unsafeCallThis: [
        'Unsafe call of an `any` typed value. `this` is typed as `any`.',
        'You can try to fix this by turning on the `noImplicitThis` compiler option, or adding a `this` parameter to the function.',
      ].join('\n'),
      unsafeNew: 'Unsafe construction of an any type value.',
      unsafeTemplateTag: 'Unsafe any typed template tag.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = util.getParserServices(context);
    const compilerOptions = services.program.getCompilerOptions();
    const isNoImplicitThis = tsutils.isStrictCompilerOptionEnabled(
      compilerOptions,
      'noImplicitThis',
    );

    function checkCall(
      node: TSESTree.Node,
      reportingNode: TSESTree.Node,
      messageId: MessageIds,
    ): void {
      const type = util.getConstrainedTypeAtLocation(services, node);

      if (util.isTypeAnyType(type)) {
        if (!isNoImplicitThis) {
          // `this()` or `this.foo()` or `this.foo[bar]()`
          const thisExpression = getThisExpression(node);
          if (
            thisExpression &&
            util.isTypeAnyType(
              util.getConstrainedTypeAtLocation(services, thisExpression),
            )
          ) {
            messageId = 'unsafeCallThis';
          }
        }
        context.report({
          node: reportingNode,
          messageId: messageId,
        });
      }
    }

    return {
      'CallExpression > *.callee'(
        node: TSESTree.CallExpression['callee'],
      ): void {
        checkCall(node, node, 'unsafeCall');
      },
      NewExpression(node): void {
        checkCall(node.callee, node, 'unsafeNew');
      },
      'TaggedTemplateExpression > *.tag'(node: TSESTree.Node): void {
        checkCall(node, node, 'unsafeTemplateTag');
      },
    };
  },
});