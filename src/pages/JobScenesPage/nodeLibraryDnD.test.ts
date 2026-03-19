import { describe, expect, it } from "vitest";
import {
  NODE_LIBRARY_DRAG_MIME,
  readNodeTypeFromDragData,
  writeNodeTypeToDragData
} from "./nodeLibraryDnD";

type MockTransfer = {
  values: Record<string, string>;
  setData: (type: string, value: string) => void;
  getData: (type: string) => string;
};

function createMockTransfer(): MockTransfer {
  const values: Record<string, string> = {};
  return {
    values,
    setData(type, value) {
      values[type] = value;
    },
    getData(type) {
      return values[type] ?? "";
    }
  };
}

describe("nodeLibraryDnD", () => {
  it("writes node type to drag data for custom mime and text/plain", () => {
    const transfer = createMockTransfer();
    writeNodeTypeToDragData(transfer, "api_call");

    expect(transfer.values[NODE_LIBRARY_DRAG_MIME]).toBe("api_call");
    expect(transfer.values["text/plain"]).toBe("api_call");
  });

  it("reads valid node type from drag data", () => {
    const transfer = createMockTransfer();
    transfer.setData(NODE_LIBRARY_DRAG_MIME, "page_set");

    expect(readNodeTypeFromDragData(transfer)).toBe("page_set");
  });

  it("reads page_click type from drag data", () => {
    const transfer = createMockTransfer();
    transfer.setData("text/plain", "page_click");

    expect(readNodeTypeFromDragData(transfer)).toBe("page_click");
  });

  it("reads send_hotkey type from drag data", () => {
    const transfer = createMockTransfer();
    transfer.setData(NODE_LIBRARY_DRAG_MIME, "send_hotkey");

    expect(readNodeTypeFromDragData(transfer)).toBe("send_hotkey");
  });

  it("returns null for invalid drag data", () => {
    const transfer = createMockTransfer();
    transfer.setData(NODE_LIBRARY_DRAG_MIME, "unknown");
    transfer.setData("text/plain", "invalid");

    expect(readNodeTypeFromDragData(transfer)).toBeNull();
  });
});
