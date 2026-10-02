import {
  GraphQLError,
  Kind,
  ValidationRule,
  SelectionSetNode,
  FragmentDefinitionNode,
} from "graphql";

// Limit expanded fragments/aliases before resolvers or database calls run.
export const queryLimits: ValidationRule = (context) => {
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const definition of context.getDocument().definitions)
    if (definition.kind === Kind.FRAGMENT_DEFINITION)
      fragments.set(definition.name.value, definition);
  let cost = 0;
  const walk = (
    selection: SelectionSetNode,
    depth: number,
    path: Set<string>,
    multiplier: number,
  ) => {
    if (depth > 10 || cost > 60000) return false;
    for (const node of selection.selections) {
      if (node.kind === Kind.FIELD) {
        cost += multiplier;
        const list =
          /^(watches|changes|snapshots|notifications|checkRuns)(Page)?$/.test(
            node.name.value,
          );
        if (
          node.selectionSet &&
          !walk(
            node.selectionSet,
            depth + 1,
            path,
            multiplier *
              (list
                ? node.arguments?.find((arg) => arg.name.value === "first")
                    ?.value.kind === Kind.INT
                  ? Math.max(
                      1,
                      Math.min(
                        100,
                        Number(
                          (
                            node.arguments.find(
                              (arg) => arg.name.value === "first",
                            )!.value as { value: string }
                          ).value,
                        ),
                      ),
                    )
                  : 100
                : 1),
          )
        )
          return false;
      } else if (node.kind === Kind.INLINE_FRAGMENT) {
        if (!walk(node.selectionSet, depth, path, multiplier)) return false;
      } else {
        const name = node.name.value;
        const fragment = fragments.get(name);
        if (path.has(name)) return false;
        if (
          fragment &&
          !walk(
            fragment.selectionSet,
            depth,
            new Set([...path, name]),
            multiplier,
          )
        )
          return false;
      }
    }
    return cost <= 60000;
  };
  return {
    OperationDefinition(node) {
      if (!walk(node.selectionSet, 1, new Set(), 1))
        context.reportError(
          new GraphQLError("Query exceeds depth or complexity limits."),
        );
    },
  };
};
