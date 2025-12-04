declare module 'json-ast' {
  const parse: (source: string) => AST.JsonDocument;

  namespace AST {
    class JsonNode {
      static toJSON(jsonNode: JsonNode): unknown;
    }

    class JsonDocument extends JsonNode {}
  }
}
