import { useEffect, useMemo, useState } from "react";
import { configCenterService } from "../services/configCenterService";
import type { GeneralConfigItem } from "../types";
import { buildRegionOptions, REGION_GROUP_KEY } from "../regionConfig";

export function useRegionConfig() {
  const [items, setItems] = useState<GeneralConfigItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const rows = await configCenterService.listGeneralConfigItems(REGION_GROUP_KEY);
        if (active) {
          setItems(rows);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const options = useMemo(() => buildRegionOptions(items), [items]);

  return {
    items,
    options,
    loading
  };
}
