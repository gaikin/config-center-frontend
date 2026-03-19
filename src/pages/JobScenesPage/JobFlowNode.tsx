import { DeleteOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import styled from "styled-components";
import type { FlowNodeData } from "./jobScenesPageShared";

type JobFlowCanvasNode = Node<FlowNodeData, "jobNode">;

const NodeWrapper = styled.div`
  position: relative;
  width: 100%;
  min-height: 64px;
  padding: 10px 34px 10px 12px;
  display: flex;
  align-items: center;
`;

const NodeLabel = styled.div`
  width: 100%;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
`;

const DeleteButton = styled(Button)`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  min-width: 20px;
  padding: 0;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #ffd6d6;

  &:hover {
    background: #fff1f0 !important;
    border-color: #ffb3b3 !important;
  }
`;

export function JobFlowNode(props: NodeProps<JobFlowCanvasNode>) {
  return (
    <NodeWrapper>
      <Handle type="target" position={Position.Left} />
      <NodeLabel>{props.data.label}</NodeLabel>
      {props.data.onDelete ? (
        <Tooltip title="删除节点">
          <DeleteButton
            className="nodrag nopan"
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label="delete-flow-node"
            onClick={(event) => {
              event.stopPropagation();
              props.data.onDelete?.();
            }}
          />
        </Tooltip>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </NodeWrapper>
  );
}
