import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { RocketLaunchIcon, PaperAirplaneIcon, DocumentTextIcon, CheckIcon } from '@heroicons/react/24/outline';
import { deploymentService } from '../services/deployment.service';
import { Branch, DeploymentRequest } from '../types';
import { ButtonSpinner, PageLoader } from '../components/common/LoadingSpinner';
import { useAuthStore } from '../store/authStore';

interface FormData {
  // Section 1 — Request Details
  deployment_title:       string;
  requested_by_name:      string;
  team:                   string;
  priority:               string;
  requested_deploy_date:  string;
  ticket_link:            string;
  // Section 2 — Code & Branch Info
  repository:             string;
  service_name:           string;
  branch_name:            string;
  base_branch:            string;
  commit_sha:             string;
  artifact_version:       string;
  pull_request_link:      string;
  pr_approved_by:         string;
  description:            string;
  risk_level:             string;
  // Section 3 — Deployment Target
  environments:           string[];
  deployment_type:        string;
  deployment_sub_type:    string;
  downtime_required:      boolean;
  db_migration:           boolean;
  feature_flags:          string;
  config_changes:         string;
  dependencies:           string;
  project_name:           string;
}

const JOB_SUB_TYPES = ['Picking Job', 'Data Moving Job', 'API Job'];
const ALL_ENVS = ['DEV', 'QA', 'UAT', 'PROD'];

const SectionHeader: React.FC<{ num: string; title: string }> = ({ num, title }) => (
  <div className="flex items-center gap-3 mb-5 pb-2 border-b border-gray-200">
    <span className="text-sm font-bold text-blue-600 tracking-widest">{num}. {title}</span>
  </div>
);

export const NewDeploymentPage: React.FC = () => {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const isEdit     = !!id;
  const { user }   = useAuthStore();

  const [branches, setBranches]         = useState<Branch[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [savingDraft, setSavingDraft]   = useState(false);
  const [loading, setLoading]           = useState(isEdit);

  const {
    register, handleSubmit, control, watch,
    formState: { errors }, reset, setValue, setError, clearErrors,
  } = useForm<FormData>({
    defaultValues: {
      priority: 'medium', risk_level: 'low', base_branch: 'main',
      downtime_required: false, db_migration: false, environments: [],
      requested_by_name: user?.name || '', team: user?.team || '',
    },
  });

  const watchedEnvs    = watch('environments') || [];
  const watchedTicket  = watch('ticket_link');
  const watchedDesc    = watch('description');
  const isSingleEnv    = watchedEnvs.length === 1;
  const isMultiEnv     = watchedEnvs.length > 1;

  useEffect(() => {
    deploymentService.getBranches().then(setBranches);
    if (isEdit && id) {
      deploymentService.getById(id).then((dep) => {
        const meta = (dep as any).extra_meta
          ? (typeof (dep as any).extra_meta === 'string'
              ? JSON.parse((dep as any).extra_meta)
              : (dep as any).extra_meta)
          : {};
        const envs = dep.environment ? dep.environment.split(',').map((e: string) => e.trim()) : [];
        const type = (dep as any).deployment_type || '';
        setSelectedType(type);
        reset({
          deployment_title:      dep.deployment_title,
          project_name:          dep.project_name,
          branch_name:           dep.branch_name,
          ticket_link:           dep.ticket_link || '',
          description:           dep.description,
          priority:              dep.priority,
          environments:          envs,
          deployment_type:       type,
          deployment_sub_type:   (dep as any).deployment_sub_type || '',
          risk_level:            (dep as any).risk_level || 'low',
          downtime_required:     !!(dep as any).downtime_required,
          db_migration:          !!(dep as any).db_migration,
          requested_deploy_date: (dep as any).requested_deploy_date?.slice(0, 16) || '',
          ...meta,
        });
        setLoading(false);
      });
    }
  }, [id]);

  const toggleEnv = (env: string, current: string[], onChange: (v: string[]) => void) => {
    if (env === 'ALL') onChange(current.length === ALL_ENVS.length ? [] : [...ALL_ENVS]);
    else onChange(current.includes(env) ? current.filter((e) => e !== env) : [...current, env]);
    clearErrors('environments');
    clearErrors('ticket_link');
    clearErrors('description');
  };

  const buildPayload = (data: FormData, status: string): Partial<DeploymentRequest> | null => {
    if (data.environments.length === 0) {
      setError('environments', { message: 'Select at least one environment' }); return null;
    }
    if (isSingleEnv) {
      let ok = true;
      if (!data.ticket_link?.trim()) { setError('ticket_link', { message: 'Required for single environment' }); ok = false; }
      if (!data.description?.trim()) { setError('description', { message: 'Required for single environment' }); ok = false; }
      if (!ok) return null;
    } else if (!data.ticket_link?.trim() && !data.description?.trim()) {
      setError('ticket_link', { message: 'Provide at least one: Ticket Link or Description' });
      setError('description', { message: 'Provide at least one: Ticket Link or Description' });
      return null;
    }
    const jobId = data.deployment_type === 'Job Deployment'
      ? `${data.deployment_type} — ${data.deployment_sub_type}`
      : data.deployment_type;
    return {
      ...data,
      job_id:      jobId,
      environment: data.environments.join(', '),
      status,
    } as any;
  };

  const onSaveDraft = handleSubmit(async (data) => {
    const payload = buildPayload(data, 'draft');
    if (!payload) return;
    setSavingDraft(true);
    try {
      if (isEdit) { await deploymentService.update(id!, payload); toast.success('Draft updated'); }
      else { await deploymentService.create(payload); toast.success('Draft saved'); navigate('/deployments'); }
    } finally { setSavingDraft(false); }
  });

  const onSubmitToQA = handleSubmit(async (data) => {
    const payload = buildPayload(data, 'pending_qa_approval');
    if (!payload) return;
    setSubmitting(true);
    try {
      if (isEdit) { await deploymentService.update(id!, payload); toast.success('Resubmitted to QA!'); }
      else { await deploymentService.create(payload); toast.success('Submitted to QA for approval!'); }
      navigate(['qa', 'admin'].includes(user?.role || '') ? '/qa' : '/deployments');
    } finally { setSubmitting(false); }
  });

  if (loading) return <PageLoader />;

  const inputCls  = (err?: any) => `w-full px-3 py-2 border ${err ? 'border-red-400' : 'border-gray-300'} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400`;
  const selectCls = (err?: any) => `w-full px-3 py-2 border ${err ? 'border-red-400' : 'border-gray-300'} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white`;
  const errMsg    = (msg?: string) => msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null;

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <RocketLaunchIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{isEdit ? 'Edit Deployment Request' : 'New Deployment Request'}</h1>
          <p className="text-sm text-gray-500">Fill in the details below and submit for QA approval or save as draft.</p>
        </div>
      </div>

      <form className="space-y-6">

        {/* ── Section 1: Request Details ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <SectionHeader num="1" title="REQUEST DETAILS" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deployment Title <span className="text-red-500">*</span></label>
              <input {...register('deployment_title', { required: 'Required' })} className={inputCls(errors.deployment_title)} placeholder="e.g. DEP-001 Auth Service v2.1" />
              {errMsg(errors.deployment_title?.message)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Submitted</label>
              <input type="date" className={inputCls()} defaultValue={new Date().toISOString().slice(0, 10)} readOnly />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requested By <span className="text-red-500">*</span></label>
              <input {...register('requested_by_name', { required: 'Required' })} className={inputCls(errors.requested_by_name)} placeholder="e.g. John Doe" />
              {errMsg(errors.requested_by_name?.message)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team <span className="text-red-500">*</span></label>
              <select {...register('team', { required: 'Required' })} className={selectCls(errors.team)}>
                <option value="">e.g. Platform Team</option>
                {['Platform Team','Backend Team','Frontend Team','DevOps Team','Data Team','QA Team','Mobile Team'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errMsg(errors.team?.message)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority <span className="text-red-500">*</span></label>
              <select {...register('priority', { required: 'Required' })} className={selectCls()}>
                <option value="low">🟢 Low</option>
                <option value="medium">🔵 Medium</option>
                <option value="high">🟠 High</option>
                <option value="critical">🔴 Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requested Deploy Date/Time <span className="text-red-500">*</span></label>
              <input type="datetime-local" {...register('requested_deploy_date', { required: 'Required' })} className={inputCls(errors.requested_deploy_date)} />
              {errMsg(errors.requested_deploy_date?.message)}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ticket / JIRA Link</label>
              <input {...register('ticket_link')} className={inputCls(errors.ticket_link)} placeholder="e.g. https://jira.company.com/browse/PROJ-123" onChange={() => clearErrors('ticket_link')} />
              {errMsg(errors.ticket_link?.message)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name <span className="text-red-500">*</span></label>
              <input {...register('project_name', { required: 'Required' })} className={inputCls(errors.project_name)} placeholder="e.g. Neutara Platform" />
              {errMsg(errors.project_name?.message)}
            </div>

          </div>
        </div>

        {/* ── Section 2: Code & Branch Info ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <SectionHeader num="2" title="CODE & BRANCH INFO" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repository <span className="text-red-500">*</span></label>
              <input {...register('repository', { required: 'Required' })} className={inputCls(errors.repository)} placeholder="e.g. git@github.com:org/repo.git" />
              {errMsg(errors.repository?.message)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service / Application <span className="text-red-500">*</span></label>
              <input {...register('service_name', { required: 'Required' })} className={inputCls(errors.service_name)} placeholder="e.g. Auth Service" />
              {errMsg(errors.service_name?.message)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name <span className="text-red-500">*</span></label>
              <select {...register('branch_name', { required: 'Required' })} className={selectCls(errors.branch_name)}>
                <option value="">Select branch...</option>
                {branches.map(b => <option key={b.id} value={b.branch_name}>{b.branch_name}</option>)}
                <option value="custom">Custom branch...</option>
              </select>
              {errMsg(errors.branch_name?.message)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base / Target Branch <span className="text-red-500">*</span></label>
              <input {...register('base_branch', { required: 'Required' })} className={inputCls(errors.base_branch)} placeholder="main" />
              {errMsg(errors.base_branch?.message)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Main Commit SHA <span className="text-red-500">*</span></label>
              <input {...register('commit_sha', { required: 'Required' })} className={inputCls(errors.commit_sha)} placeholder="e.g. a1b2c3d4e5f6g7h8i9j0" />
              {errMsg(errors.commit_sha?.message)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Build / Artifact Version <span className="text-red-500">*</span></label>
              <input {...register('artifact_version', { required: 'Required' })} className={inputCls(errors.artifact_version)} placeholder="e.g. 1.2.3" />
              {errMsg(errors.artifact_version?.message)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pull Request Link</label>
              <input {...register('pull_request_link')} className={inputCls()} placeholder="e.g. https://github.com/org/repo/pull/123" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PR Approved By</label>
              <input {...register('pr_approved_by')} className={inputCls()} placeholder="e.g. Jane Smith" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level <span className="text-red-500">*</span></label>
              <select {...register('risk_level', { required: 'Required' })} className={selectCls()}>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="critical">🔴 Critical</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Change Summary <span className="text-red-500">*</span></label>
              <textarea
                {...register('description', { required: 'Required', minLength: { value: 10, message: 'Min 10 characters' } })}
                className={`${inputCls(errors.description)} resize-none`}
                rows={3}
                placeholder="Describe the changes in this deployment..."
                onChange={() => clearErrors('description')}
              />
              {errMsg(errors.description?.message)}
            </div>

          </div>
        </div>

        {/* ── Section 3: Deployment Target ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <SectionHeader num="3" title="DEPLOYMENT TARGET" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Environment multi-select */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Environment <span className="text-red-500">*</span>
                {isSingleEnv && <span className="ml-1 text-xs text-gray-400 font-normal">— both fields required</span>}
                {isMultiEnv && <span className="ml-1 text-xs text-amber-500 font-normal">— at least one required</span>}
              </label>
              <Controller
                name="environments"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => toggleEnv('ALL', field.value, field.onChange)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1 ${field.value.length === ALL_ENVS.length ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                      {field.value.length === ALL_ENVS.length && <CheckIcon className="w-3 h-3" />} All
                    </button>
                    {ALL_ENVS.map(env => {
                      const active = field.value.includes(env);
                      const c: Record<string,string> = { DEV:'bg-green-600 text-white border-green-600', QA:'bg-yellow-500 text-white border-yellow-500', UAT:'bg-orange-500 text-white border-orange-500', PROD:'bg-red-600 text-white border-red-600' };
                      return (
                        <button key={env} type="button" onClick={() => toggleEnv(env, field.value, field.onChange)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1 ${active ? c[env] : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                          {active && <CheckIcon className="w-3 h-3" />} {env}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              {errors.environments && <p className="text-xs text-red-500 mt-1">{errors.environments.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type of Deployment <span className="text-red-500">*</span></label>
              <select {...register('deployment_type', { required: 'Required' })} className={selectCls(errors.deployment_type)}
                onChange={(e) => setSelectedType(e.target.value)}>
                <option value="">Select type...</option>
                <option value="Job Deployment">Job Deployment</option>
                <option value="All Jobs">All Jobs</option>
              </select>
              {errMsg(errors.deployment_type?.message)}
            </div>

            {selectedType === 'Job Deployment' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Type <span className="text-red-500">*</span></label>
                <select {...register('deployment_sub_type', { required: 'Required' })} className={selectCls(errors.deployment_sub_type)}>
                  <option value="">Select job type...</option>
                  {JOB_SUB_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errMsg(errors.deployment_sub_type?.message)}
              </div>
            ) : (
              <div /> // placeholder to keep grid alignment
            )}

            {/* Downtime Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Downtime Required?</label>
              <Controller name="downtime_required" control={control} render={({ field }) => (
                <div className="flex gap-2">
                  {[true, false].map(val => (
                    <button key={String(val)} type="button"
                      onClick={() => field.onChange(val)}
                      className={`px-5 py-1.5 rounded-full text-sm font-medium border transition-colors ${field.value === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                      {val ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              )} />
            </div>

            {/* DB Migration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">DB Migration?</label>
              <Controller name="db_migration" control={control} render={({ field }) => (
                <div className="flex gap-2">
                  {[true, false].map(val => (
                    <button key={String(val)} type="button"
                      onClick={() => field.onChange(val)}
                      className={`px-5 py-1.5 rounded-full text-sm font-medium border transition-colors ${field.value === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                      {val ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              )} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feature Flags</label>
              <input {...register('feature_flags')} className={inputCls()} placeholder="Select or type feature flags..." />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Config / Env Var Changes</label>
              <textarea {...register('config_changes')} className={`${inputCls()} resize-none`} rows={2}
                placeholder="List any configuration or environment variable changes..." />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dependencies / Order</label>
              <textarea {...register('dependencies')} className={`${inputCls()} resize-none`} rows={2}
                placeholder="List any deployment dependencies or order of operations..." />
            </div>

          </div>
        </div>

        {/* Workflow Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <DocumentTextIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Deployment Workflow</p>
            <p className="text-xs text-blue-700 mt-0.5">
              <strong>Save Draft</strong> — stores without submitting. &nbsp;|&nbsp;
              <strong>Submit to QA</strong> — sends for QA review immediately. Once approved by QA, Infra team will deploy and you'll be notified for acknowledgment.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={() => navigate(-1)}
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={onSaveDraft} disabled={savingDraft}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
              {savingDraft ? <ButtonSpinner /> : <DocumentTextIcon className="w-4 h-4" />}
              Save Draft
            </button>
            <button type="button" onClick={onSubmitToQA} disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
              {submitting ? <ButtonSpinner /> : <PaperAirplaneIcon className="w-4 h-4" />}
              Submit to QA
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
