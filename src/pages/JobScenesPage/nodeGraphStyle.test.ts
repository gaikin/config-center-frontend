import { Position } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import type { JobNodeDefinition } from "../../types";
import { buildFlowFromNodeRows } from "./jobScenesPageShared";

describe("job scene graph style", () => {
  it("uses left-right handles and bezier edges", () => {
    const rows: JobNodeDefinition[] = [
      {
        id: 1,
        sceneId: 10,
        nodeType: "page_get",
        name: "页面取值1",
        orderNo: 1,
        enabled: true,
        configJson: "{}",
        updatedAt: "2026-03-19T00:00:00.000Z"
      },
      {
        id: 2,
        sceneId: 10,
        nodeType: "page_set",
        name: "页面写值1",
        orderNo: 2,
        enabled: true,
        configJson: "{}",
        updatedAt: "2026-03-19T00:00:00.000Z"
      }
    ];

    const flow = buildFlowFromNodeRows(rows);

    expect(flow.nodes[0]?.sourcePosition).toBe(Position.Right);
    expect(flow.nodes[1]?.targetPosition).toBe(Position.Left);
    expect(flow.edges).toHaveLength(0);
  });

  it("restores edges from saved next-node ids", () => {
    const rows: JobNodeDefinition[] = [
      {
        id: 11,
        sceneId: 10,
        nodeType: "page_get",
        name: "A",
        orderNo: 1,
        enabled: true,
        configJson: "{\"__nextNodeIds\":[\"12\"]}",
        updatedAt: "2026-03-19T00:00:00.000Z"
      },
      {
        id: 12,
        sceneId: 10,
        nodeType: "page_set",
        name: "B",
        orderNo: 2,
        enabled: true,
        configJson: "{}",
        updatedAt: "2026-03-19T00:00:00.000Z"
      }
    ];

    const flow = buildFlowFromNodeRows(rows);

    expect(flow.edges).toHaveLength(1);
    expect(flow.edges[0]).toMatchObject({
      source: "11",
      target: "12",
      type: "bezier"
    });
  });
});
