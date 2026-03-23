import type { JobNodeDefinition } from "../../types";

export const NODE_LIBRARY_DRAG_MIME = "application/x-job-scene-node-type";

const VALID_NODE_TYPES: JobNodeDefinition["nodeType"][] = [
  "page_get",
  "api_call",
  "js_script",
  "page_set",
  "page_click",
  "send_hotkey"
];

function isJobNodeType(value: string): value is JobNodeDefinition["nodeType"] {
  return VALID_NODE_TYPES.includes(value as JobNodeDefinition["nodeType"]);
}

type DragDataSetter = Pick<DataTransfer, "setData">;
type DragDataGetter = Pick<DataTransfer, "getData">;

export function writeNodeTypeToDragData(dataTransfer: DragDataSetter | null | undefined, nodeType: JobNodeDefinition["nodeType"]) {
  if (!dataTransfer) {
    return;
  }
  dataTransfer.setData(NODE_LIBRARY_DRAG_MIME, nodeType);
  dataTransfer.setData("text/plain", nodeType);
}

export function readNodeTypeFromDragData(dataTransfer: DragDataGetter | null | undefined): JobNodeDefinition["nodeType"] | null {
  if (!dataTransfer) {
    return null;
  }
  const typedValue = dataTransfer.getData(NODE_LIBRARY_DRAG_MIME);
  if (isJobNodeType(typedValue)) {
    return typedValue;
  }
  const plainValue = dataTransfer.getData("text/plain");
  if (isJobNodeType(plainValue)) {
    return plainValue;
  }
  return null;
}
