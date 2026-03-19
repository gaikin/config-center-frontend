import { Button, Card, Space, Tag, Typography } from "antd";
import type { JobNodeDefinition } from "../../types";
import type { NodeLibraryItem } from "./jobScenesPageShared";
import { writeNodeTypeToDragData } from "./nodeLibraryDnD";

type NodeLibraryPanelProps = {
  items: NodeLibraryItem[];
  selectedNodeType: JobNodeDefinition["nodeType"] | null;
  disabledNodeTypes?: JobNodeDefinition["nodeType"][];
  onSelect: (nodeType: JobNodeDefinition["nodeType"]) => void;
  onAdd: (nodeType: JobNodeDefinition["nodeType"]) => void;
};

export function NodeLibraryPanel(props: NodeLibraryPanelProps) {
  const disabledNodeTypes = new Set(props.disabledNodeTypes ?? []);
  const selectedItem = props.items.find((item) => item.nodeType === props.selectedNodeType) ?? null;

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Typography.Text type="secondary">点击节点仅查看说明，确认后再添加到流程。支持拖拽到右侧画布直接创建。</Typography.Text>
      {props.items.map((item) => {
        const selected = item.nodeType === props.selectedNodeType;
        return (
          <Button
            key={item.nodeType}
            block
            type={selected ? "primary" : "default"}
            style={
              selected
                ? undefined
                : {
                    borderColor: "var(--line-default)",
                    background: "var(--bg-page)",
                    color: "var(--text-primary)"
                  }
            }
            disabled={disabledNodeTypes.has(item.nodeType)}
            onClick={() => props.onSelect(item.nodeType)}
            draggable={!disabledNodeTypes.has(item.nodeType)}
            onDragStart={(event) => {
              props.onSelect(item.nodeType);
              writeNodeTypeToDragData(event.dataTransfer, item.nodeType);
              event.dataTransfer.effectAllowed = "copy";
            }}
          >
            {item.label}
          </Button>
        );
      })}
      {selectedItem ? (
        <Card size="small" title="查看节点说明" extra={<Tag color="processing">已选中</Tag>}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text strong>{selectedItem.label}</Typography.Text>
            <Typography.Text type="secondary">{selectedItem.description}</Typography.Text>
            <Button
              type="primary"
              disabled={disabledNodeTypes.has(selectedItem.nodeType)}
              onClick={() => props.onAdd(selectedItem.nodeType)}
            >
              添加到流程
            </Button>
          </Space>
        </Card>
      ) : null}
    </Space>
  );
}
