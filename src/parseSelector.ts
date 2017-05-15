import * as selectorParser from "postcss-selector-parser";
const selectorParserFn = require("postcss-selector-parser");

import { selectorSourceLocation } from "./SourceLocation";
import * as errors from "./errors";

export interface SelectorNode {
  parent?: SelectorNode;
  type: string;
  value: string;
  spaces: {
    before: string,
    after: string
  };
  remove: () => SelectorNode;
  replaceWith: () => SelectorNode;
  next: () => SelectorNode;
  prev: () => SelectorNode;
  clone: (overrides: {[prop: string]: any}) => SelectorNode;
  toString: () => string;
}

export interface ParsedSelector {
  context?: SelectorNode[];
  combinator?: SelectorNode;
  key: SelectorNode[];
  pseudoelement?: SelectorNode;
}

export function isState(node) {
  return node.type === selectorParser.ATTRIBUTE &&
         node.namespace === "state";
}

export function isSubstate(node) {
  return node.type === selectorParser.ATTRIBUTE &&
         node.namespace === "substate";
}

function isPseudoelement(node: any) {
  return node.type === selectorParser.PSEUDO &&
    (
      node.value.startsWith("::") ||
      node.value === ":before" ||
      node.value === ":after"
    );
}

export interface StateInfo {
  group?: string;
  name: string;
}

export function stateParser(sourceFile: string, rule, attr): StateInfo {
  let stateType = attr.namespace;
  let info: StateInfo = {
    name: attr.attribute
  };
  if (attr.value) {
    if (attr.operator !== "=") {
      throw new errors.InvalidBlockSyntax(`A ${stateType} with a value must use the = operator (found ${attr.operator} instead).`,
                                          selectorSourceLocation(sourceFile, rule, attr));
    }
    info.group = info.name;
    info.name = attr.value;
  }
  return info;
}

export default function parseSelector(selector: string): ParsedSelector[] {
  let parsedSelectors: ParsedSelector[] = [];
  let selectors =  selectorParserFn().process(selector).res;
  selectors.nodes.forEach((sel) => {
    let parsedSel: ParsedSelector = <ParsedSelector>{};
    let compoundSel: any[] = [];
    let nodes = sel.nodes.slice().reverse();
    nodes.forEach((node) => {
      if (isPseudoelement(node)) {
        parsedSel.pseudoelement = node;
      } else if (node.type === selectorParser.COMBINATOR && parsedSel.combinator === undefined) {
        parsedSel.combinator = node;
        parsedSel.key = compoundSel;
        compoundSel = [];
      } else {
        compoundSel.unshift(node);
      }
    });
    if (parsedSel.key) {
      parsedSel.context = compoundSel;
    } else {
      parsedSel.key = compoundSel;
    }
    parsedSelectors.push(parsedSel);
  });
  return parsedSelectors;
}