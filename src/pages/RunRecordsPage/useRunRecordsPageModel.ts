import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { configCenterService } from "../../services/configCenterService";
import type { JobExecutionRecord, JobExecutionRecordFilters, PageResource, PromptHitRecord, PromptHitRecordFilters } from "../../types";
import {
  buildRunRecordJobOrgOptions,
  buildRunRecordPageOptions,
  buildRunRecordPromptOrgOptions,
  getRunRecordDefaults,
  type RunRecordTabKey
} from "./runRecordsPageShared";

type LoadState = {
  loading: boolean;
  error: string | null;
};

export function useRunRecordsPageModel() {
  const [searchParams] = useSearchParams();
  const defaults = useMemo(() => getRunRecordDefaults(searchParams), [searchParams]);
  const [activeTab, setActiveTab] = useState<RunRecordTabKey>(defaults.activeTab);
  const [resources, setResources] = useState<PageResource[]>([]);
  const [promptRows, setPromptRows] = useState<PromptHitRecord[]>([]);
  const [jobRows, setJobRows] = useState<JobExecutionRecord[]>([]);
  const [promptFilters, setPromptFilters] = useState<PromptHitRecordFilters>(defaults.promptFilters);
  const [jobFilters, setJobFilters] = useState<JobExecutionRecordFilters>(defaults.jobFilters);
  const [promptState, setPromptState] = useState<LoadState>({ loading: true, error: null });
  const [jobState, setJobState] = useState<LoadState>({ loading: true, error: null });
  const [resourceState, setResourceState] = useState<LoadState>({ loading: true, error: null });
  const [promptOrgRows, setPromptOrgRows] = useState<PromptHitRecord[]>([]);
  const [jobOrgRows, setJobOrgRows] = useState<JobExecutionRecord[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setResourceState({ loading: true, error: null });
        const resourceRows = await configCenterService.listPageResources();
        if (!active) {
          return;
        }
        setResources(resourceRows);
        setResourceState({ loading: false, error: null });
      } catch (error) {
        if (!active) {
          return;
        }
        setResourceState({ loading: false, error: error instanceof Error ? error.message : "页面资源加载失败" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [promptAllRows, jobAllRows] = await Promise.all([
          configCenterService.listPromptHitRecords({}),
          configCenterService.listJobExecutionRecords({})
        ]);
        if (!active) {
          return;
        }
        setPromptOrgRows(promptAllRows);
        setJobOrgRows(jobAllRows);
      } catch {
        if (!active) {
          return;
        }
        setPromptOrgRows([]);
        setJobOrgRows([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setPromptState({ loading: true, error: null });
        const rows = await configCenterService.listPromptHitRecords(promptFilters);
        if (!active) {
          return;
        }
        setPromptRows(rows);
        setPromptState({ loading: false, error: null });
      } catch (error) {
        if (!active) {
          return;
        }
        setPromptRows([]);
        setPromptState({ loading: false, error: error instanceof Error ? error.message : "记录加载失败，请稍后重试" });
      }
    })();
    return () => {
      active = false;
    };
  }, [promptFilters]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setJobState({ loading: true, error: null });
        const rows = await configCenterService.listJobExecutionRecords(jobFilters);
        if (!active) {
          return;
        }
        setJobRows(rows);
        setJobState({ loading: false, error: null });
      } catch (error) {
        if (!active) {
          return;
        }
        setJobRows([]);
        setJobState({ loading: false, error: error instanceof Error ? error.message : "记录加载失败，请稍后重试" });
      }
    })();
    return () => {
      active = false;
    };
  }, [jobFilters]);

  const pageOptions = useMemo(() => buildRunRecordPageOptions(resources), [resources]);
  const promptOrgOptions = useMemo(() => buildRunRecordPromptOrgOptions(promptOrgRows), [promptOrgRows]);
  const jobOrgOptions = useMemo(() => buildRunRecordJobOrgOptions(jobOrgRows), [jobOrgRows]);

  return {
    activeTab,
    setActiveTab,
    promptRows,
    jobRows,
    promptFilters,
    setPromptFilters,
    jobFilters,
    setJobFilters,
    promptState,
    jobState,
    pageOptions,
    promptOrgOptions,
    jobOrgOptions,
    resourceState
  };
}

