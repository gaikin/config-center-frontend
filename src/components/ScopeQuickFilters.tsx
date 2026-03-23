import { Card, Select, Space, Tag, Typography } from "antd";

export type ScopeMenuOption = {
  id: number;
  label: string;
};

export type ScopePageOption = {
  id: number;
  label: string;
  menuId: number;
  menuLabel?: string;
};

export type ScopeQuickFiltersProps = {
  menus: ScopeMenuOption[];
  pages: ScopePageOption[];
  selectedMenuId?: number;
  selectedPageId?: number;
  onMenuChange: (value?: number) => void;
  onPageChange: (value?: number) => void;
};

function formatMenuLabel(menu: ScopeMenuOption) {
  return menu.label;
}

function formatPageLabel(page: ScopePageOption) {
  return page.label;
}

export function ScopeQuickFilters({
  menus,
  pages,
  selectedMenuId,
  selectedPageId,
  onMenuChange,
  onPageChange
}: ScopeQuickFiltersProps) {
  const pageOptions = selectedMenuId ? pages.filter((item) => item.menuId === selectedMenuId) : pages;
  const selectedMenu = selectedMenuId ? menus.find((item) => item.id === selectedMenuId) ?? null : null;
  const selectedPage = selectedPageId ? pages.find((item) => item.id === selectedPageId) ?? null : null;

  return (
    <Card size="small" title="切换菜单 / 页面">
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Space size={8} wrap style={{ width: "100%" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Typography.Text type="secondary">菜单</Typography.Text>
            <Select
              style={{ width: "100%", marginTop: 6 }}
              showSearch
              allowClear
              placeholder={menus.length > 0 ? "请选择菜单" : "暂无菜单"}
              value={selectedMenuId}
              optionFilterProp="label"
              options={menus.map((menu) => ({ label: formatMenuLabel(menu), value: menu.id }))}
              onChange={(value) => {
                onMenuChange(typeof value === "number" ? value : undefined);
                onPageChange(undefined);
              }}
              disabled={menus.length === 0}
            />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Typography.Text type="secondary">页面</Typography.Text>
            <Select
              style={{ width: "100%", marginTop: 6 }}
              showSearch
              allowClear
              placeholder={pageOptions.length > 0 ? "请选择页面" : "暂无页面"}
              value={selectedPageId}
              optionFilterProp="label"
              options={pageOptions.map((page) => ({ label: formatPageLabel(page), value: page.id }))}
              onChange={(value) => {
                const nextPageId = typeof value === "number" ? value : undefined;
                const nextPage = nextPageId ? pages.find((item) => item.id === nextPageId) ?? null : null;
                if (nextPage) {
                  onMenuChange(nextPage.menuId);
                }
                onPageChange(nextPageId);
              }}
              disabled={pageOptions.length === 0}
            />
          </div>
        </Space>
        <Space size={6} wrap>
          {selectedMenu ? <Tag color="blue">当前菜单：{formatMenuLabel(selectedMenu)}</Tag> : <Tag>当前菜单：全部</Tag>}
          {selectedPage ? <Tag color="processing">当前页面：{formatPageLabel(selectedPage)}</Tag> : <Tag>当前页面：全部</Tag>}
        </Space>
      </Space>
    </Card>
  );
}
