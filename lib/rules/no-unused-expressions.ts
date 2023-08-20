import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils/dist';
import type {
  InferMessageIdsTypeFromRule,
  InferOptionsTypeFromRule,
} from '@typescript-eslint/utils/dist/eslint-utils';
import * as ESLintUtils from '@typescript-eslint/utils/dist/eslint-utils';
import baseRule from 'eslint/lib/rules/no-unused-expressions';

type MessageIds = InferMessageIdsTypeFromRule<typeof baseRule>;
type Options = InferOptionsTypeFromRule<typeof baseRule>;

const createRule = ESLintUtils.RuleCreator(
  name =>
    `https://github.com/rewento/typescript-eslint-plugin-chai-friendly/tree/master/rules/${name}`,
);

export default createRule<Options, MessageIds>({
  name: 'no-unused-expressions',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow unused expressions',
      extendsBaseRule: true,
    },
    hasSuggestions: baseRule.meta.hasSuggestions,
    schema: baseRule.meta.schema,
    messages: baseRule.meta.messages,
  },
  defaultOptions: [
    {
      allowShortCircuit: false,
      allowTernary: false,
      allowTaggedTemplates: false,
    },
  ],
  create(context, [{ allowShortCircuit = false, allowTernary = false }]) {
    const rules = baseRule.create(context);

    function isValidExpression(node: TSESTree.Node): boolean {
      if (allowShortCircuit && node.type === AST_NODE_TYPES.LogicalExpression) {
        return isValidExpression(node.right);
      }
      if (allowTernary && node.type === AST_NODE_TYPES.ConditionalExpression) {
        return (
          isValidExpression(node.alternate) &&
          isValidExpression(node.consequent)
        );
      }
      return (
        (node.type === AST_NODE_TYPES.ChainExpression &&
          node.expression.type === AST_NODE_TYPES.CallExpression) ||
        node.type === AST_NODE_TYPES.ImportExpression
      );
    }

    /**
     * Determines whether or not a given node is a chai's expect statement.
     * e.g. expect(foo).to.eventually.be.true;
     * @param {ASTNode} node - any node
     * @returns {boolean} whether the given node is a chai expectation
     */
    function isChaiExpectCall(node) {
      let expression = node.expression;
      if (expression.type !== 'MemberExpression') {
        return false;
      }

      return Boolean(findExpectCall(expression.object));
    }

    /**
     * Searches for the chai expect(...) call down the AST.
     * @param {ASTNode} node - any node
     * @returns {ASTNode} expect(...) call expression or null
     */
    function findExpectCall(node) {
      // Found expect(...) call, return the node
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'expect'
      ) {
        return node;
      }

      // Continue search up the AST if it's a member call
      if (node.type === 'MemberExpression') {
        return findExpectCall(node.object);
      }
      if (node.type === 'CallExpression') {
        return findExpectCall(node.callee);
      }
      if (node.type === 'ChainExpression') {
        return findExpectCall(node.expression);
      }

      // Stop search, expect(...) not found
      return null;
    }

    /**
     * Determines whether or not a given node is a chai's should statement.
     * e.g. foo.should.eventually.be.true;
     * @param {ASTNode} node - any node
     * @returns {boolean} whether the given node is a chai should statement
     */
    function isChaiShouldCall(node) {
      let expression = node.expression;
      if (expression.type === 'ChainExpression') {
        expression = expression.expression;
      }
      if (expression.type !== 'MemberExpression') {
        return false;
      }

      return Boolean(findShouldCall(expression.object));
    }

    /**
     * Searches for the chai obj.should call down the AST.
     * @param {ASTNode} node - any node
     * @returns {ASTNode} obj.should call expression or null
     */
    function findShouldCall(node) {
      // Found obj.should call, return the node
      if (
        node.type === 'MemberExpression' &&
        node.property &&
        node.property.name === 'should'
      ) {
        return node;
      }

      // Continue search up the AST if it's a member call
      if (node.type === 'MemberExpression') {
        return findShouldCall(node.object);
      }
      if (node.type === 'CallExpression') {
        return findShouldCall(node.callee);
      }
      if (node.type === 'ChainExpression') {
        return findShouldCall(node.expression);
      }

      // Stop search, obj.should not found
      return null;
    }

    return {
      ExpressionStatement(node): void {
        if (
          node.directive ||
          isValidExpression(node.expression) ||
          isChaiExpectCall(node) ||
          isChaiShouldCall(node)
        ) {
          return;
        }

        rules.ExpressionStatement(node);
      },
    };
  },
});
