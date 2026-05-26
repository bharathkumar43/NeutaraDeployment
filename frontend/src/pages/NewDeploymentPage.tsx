import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { RocketLaunchIcon, PaperAirplaneIcon, DocumentTextIcon, CheckIcon, EnvelopeIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { deploymentService } from '../services/deployment.service';
import { Branch, Job, DeploymentRequest } from '../types';
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
  pull_request_link:      string;
  pr_approved_by:         string;
  description:            string;
  risk_level:             string;
  env_name:               string;
  // Section 3 — Deployment Target
  environments:           string[];
  product_type:           string;
  job_ids:                string[];
  downtime_required:      boolean;
  feature_flags:          string;
  dependencies:           string;
  deployment_scope:       'single' | 'multiple';
  single_project_name:    string;
  multi_project_names:    string;
}

const ALL_ENVS = ['DEV', 'QA', 'UI', 'PROD'];

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
  const [jobs, setJobs]                 = useState<Job[]>([]);
  const [requestNumber, setRequestNumber] = useState<string>('');
  const [submitting, setSubmitting]     = useState(false);
  const [savingDraft, setSavingDraft]   = useState(false);
  const [loading, setLoading]           = useState(isEdit);
  const [emailSent, setEmailSent]       = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [jobDropdownOpen, setJobDropdownOpen] = useState(false);
  const jobDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (jobDropdownRef.current && !jobDropdownRef.current.contains(e.target as Node)) {
        setJobDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const {
    register, handleSubmit, control, watch,
    formState: { errors }, reset, setValue, setError, clearErrors,
  } = useForm<FormData>({
    defaultValues: {
      priority: 'medium', risk_level: 'low', base_branch: 'main',
      downtime_required: false, environments: [],
      product_type: '', job_ids: [],
      deployment_scope: 'single', single_project_name: '', multi_project_names: '',
      requested_by_name: user?.name || '', team: user?.team || '',
    },
  });

  const watchedEnvs         = watch('environments') || [];
  const watchedTicket       = watch('ticket_link');
  const watchedDesc         = watch('description');
  const watchedProduct      = watch('product_type');
  const watchedJobIds       = watch('job_ids') || [];
  const watchedScope        = watch('deployment_scope');
  const watchedProjectNames = watch('multi_project_names');
  const isSingleEnv         = watchedEnvs.length === 1;
  const isMultiEnv          = watchedEnvs.length > 1;

  const productTypes  = [...new Set(jobs.map(j => j.project_name).filter(Boolean))] as string[];
  const filteredJobs  = watchedProduct ? jobs.filter(j => j.project_name === watchedProduct) : [];
  const allJobIds     = filteredJobs.map(j => j.job_id);

  const toggleJob = (jobId: string, current: string[], onChange: (v: string[]) => void) => {
    if (jobId === 'ALL') onChange(current.length === allJobIds.length ? [] : [...allJobIds]);
    else onChange(current.includes(jobId) ? current.filter(id => id !== jobId) : [...current, jobId]);
    clearErrors('job_ids');
  };
  const watchedSingleName = watch('single_project_name');
  const submitBlocked =
    (watchedScope === 'single'   && !watchedSingleName?.trim()) ||
    (watchedScope === 'multiple' && (!emailSent || !watchedProjectNames?.trim()));

  useEffect(() => {
    Promise.all([
      deploymentService.getBranches(),
      deploymentService.getJobs(),
      ...(!isEdit ? [deploymentService.getNextNumber()] : []),
    ]).then(([b, j, num]) => {
      setBranches(b as Branch[]);
      setJobs(j as Job[]);
      if (num) setRequestNumber(num as string);
    });

    if (isEdit && id) {
      deploymentService.getById(id).then((dep) => {
        const meta = (dep as any).extra_meta
          ? (typeof (dep as any).extra_meta === 'string'
              ? JSON.parse((dep as any).extra_meta)
              : (dep as any).extra_meta)
          : {};
        const envs = dep.environment ? dep.environment.split(',').map((e: string) => e.trim()) : [];
        reset({
          deployment_title:      dep.deployment_title,
          branch_name:           dep.branch_name,
          ticket_link:           dep.ticket_link || '',
          description:           dep.description,
          priority:              dep.priority,
          environments:          envs,
          product_type:          (dep as any).project_name || '',
          job_ids:               dep.job_id ? dep.job_id.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
          risk_level:            (dep as any).risk_level || 'low',
          downtime_required:     !!(dep as any).downtime_required,
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
    return {
      ...data,
      project_name: data.product_type,
      job_id:       data.job_ids.join(','),
      environment:  data.environments.join(', '),
      status,
    } as any;
  };

  const onSendScopeEmail = async () => {
    const title = watch('deployment_title');
    const team  = watch('team');
    setSendingEmail(true);
    try {
      await deploymentService.sendScopeEmail(title?.trim() || 'Untitled Deployment', team || '');
      setEmailSent(true);
      toast.success('Email sent! Enter the project names below to proceed.');
    } catch {
      toast.error('Failed to send email. Check Microsoft Graph API configuration (EMAIL_SENDER, SCOPE_EMAIL_RECIPIENT) in backend .env');
    } finally {
      setSendingEmail(false);
    }
  };

  const onSaveDraft = handleSubmit(async (data) => {
    const payload = buildPayload(data, 'draft');
    if (!payload) return;
    setSavingDraft(true);
    try {
      if (isEdit) { await deploymentService.update(id!, payload); toast.success('Draft updated'); }
      else { await deploymentService.create(payload); toast.success('Draft saved'); navigate('/deployments'); }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Unknown error';
      toast.error(`Failed to save draft: ${detail}`);
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
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Unknown error';
      toast.error(`Submission failed: ${detail}`);
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deployment Request</label>
              <input
                readOnly
                value={isEdit ? '' : (requestNumber || '…')}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-blue-700 font-bold tracking-widest cursor-default"
              />
            </div>

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
                <option value="">Select team...</option>
                {['Backend Team','Frontend Team','DevOps Team','QA Team'].map(t => <option key={t} value={t}>{t}</option>)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Ticket / JIRA Link <span className="text-red-500">*</span></label>
              <input
                {...register('ticket_link')}
                className={inputCls(errors.ticket_link)}
                placeholder="e.g. https://jira.company.com/browse/PROJ-123"
                onChange={(e) => {
                  setValue('ticket_link', e.target.value);
                  clearErrors('ticket_link');
                }}
              />
              {errMsg(errors.ticket_link?.message)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name <span className="text-red-500">*</span></label>
              <select {...register('branch_name', { required: 'Required' })} className={selectCls(errors.branch_name)}>
                <option value="">Select branch...</option>
                <option value="develop">Develop</option>
                <option value="main">Main</option>
                <option value="CF-Content-Trunk-Master">CF-Content-Trunk-Master</option>
                <option value="custom">Custom branch</option>
              </select>
              {errMsg(errors.branch_name?.message)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base / Target Branch <span className="text-red-500">*</span></label>
              <input {...register('base_branch', { required: 'Required' })} className={inputCls(errors.base_branch)} placeholder="main" />
              {errMsg(errors.base_branch?.message)}
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
                {...register('description', { required: 'Required' })}
                className={`${inputCls(errors.description)} resize-none`}
                rows={3}
                placeholder="Describe the changes in this deployment..."
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
                      const c: Record<string,string> = { DEV:'bg-green-600 text-white border-green-600', QA:'bg-yellow-500 text-white border-yellow-500', UI:'bg-orange-500 text-white border-orange-500', PROD:'bg-red-600 text-white border-red-600' };
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Type <span className="text-red-500">*</span></label>
              <select
                {...register('product_type', { required: 'Required' })}
                className={selectCls(errors.product_type)}
                onChange={(e) => { setValue('product_type', e.target.value); setValue('job_ids', []); }}
              >
                <option value="">Select product...</option>
                {productTypes.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="Content-all">Content-all</option>
                <option value="Message-all">Message-all</option>
                <option value="Email-all">Email-all</option>
                <option value="Manage">Manage</option>
              </select>
              {errMsg(errors.product_type?.message)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jobs <span className="text-red-500">*</span>
                {!watchedProduct
                  ? <span className="ml-1 text-xs text-gray-400 font-normal">— select a product first</span>
                  : watchedJobIds.length > 0 && <span className="ml-1 text-xs text-blue-600 font-normal">— {watchedJobIds.length} selected</span>
                }
              </label>
              <Controller
                name="job_ids"
                control={control}
                rules={{ validate: v => v.length > 0 || 'Select at least one job' }}
                render={({ field }) => (
                  <div ref={jobDropdownRef} className="relative">
                    {/* Trigger */}
                    <button
                      type="button"
                      disabled={!watchedProduct}
                      onClick={() => watchedProduct && setJobDropdownOpen(o => !o)}
                      className={`w-full flex items-center justify-between px-3 py-2 border ${errors.job_ids ? 'border-red-400' : 'border-gray-300'} rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${!watchedProduct ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}`}
                    >
                      <span className={field.value.length === 0 ? 'text-gray-400' : 'text-gray-800'}>
                        {!watchedProduct
                          ? 'Select a product type first…'
                          : field.value.length === 0
                            ? 'Select jobs…'
                            : field.value.length === allJobIds.length
                              ? 'All Jobs'
                              : `${field.value.length} job${field.value.length > 1 ? 's' : ''} selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${jobDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown panel */}
                    {jobDropdownOpen && watchedProduct && (
                      <div className="absolute z-50 w-full mt-1 border border-gray-200 rounded-md bg-white shadow-lg max-h-56 overflow-y-auto">
                        {/* All Jobs row */}
                        <label className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-blue-50 border-b border-gray-100 select-none">
                          <input
                            type="checkbox"
                            className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                            checked={field.value.length === allJobIds.length && allJobIds.length > 0}
                            onChange={() => toggleJob('ALL', field.value, field.onChange)}
                          />
                          <span className="text-sm font-semibold text-gray-800">All Jobs</span>
                        </label>
                        {filteredJobs.map(j => (
                          <label key={j.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 select-none">
                            <input
                              type="checkbox"
                              className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                              checked={field.value.includes(j.job_id)}
                              onChange={() => toggleJob(j.job_id, field.value, field.onChange)}
                            />
                            <span className="text-sm text-gray-700">{j.job_name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              />
              {errors.job_ids && <p className="text-xs text-red-500 mt-1">{errors.job_ids.message}</p>}
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feature Flags</label>
              <input {...register('feature_flags')} className={inputCls()} placeholder="Select or type feature flags..." />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dependencies / Order</label>
              <textarea {...register('dependencies')} className={`${inputCls()} resize-none`} rows={2}
                placeholder="List any deployment dependencies or order of operations..." />
            </div>

            {/* ── Deployment Scope ── */}
            <div className="md:col-span-3">
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
                <div className="flex items-center gap-2">
                  <BuildingOffice2Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Deployment Scope <span className="text-red-500">*</span></span>
                </div>

                {/* Single / Multiple toggle */}
                <Controller
                  name="deployment_scope"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-3">
                      {(['single', 'multiple'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            field.onChange(val);
                            if (val === 'single') { setEmailSent(false); setValue('multi_project_names', ''); }
                            if (val === 'multiple') { setValue('single_project_name', ''); }
                          }}
                          className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${field.value === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
                        >
                          {val === 'single' ? 'Single Project' : 'Multiple Projects'}
                        </button>
                      ))}
                    </div>
                  )}
                />

                {/* Single project — direct name input */}
                {watchedScope === 'single' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name / Server URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('single_project_name', {
                        validate: v => watchedScope !== 'single' || !!v?.trim() || 'Project name / server URL is required',
                      })}
                      className={inputCls(errors.single_project_name)}
                      placeholder="e.g. Neutara Platform or https://server.example.com"
                    />
                    {errMsg(errors.single_project_name?.message)}
                  </div>
                )}

                {/* Multiple project flow */}
                {watchedScope === 'multiple' && (
                  <div className="space-y-3 pt-1">
                    {!emailSent ? (
                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <EnvelopeIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800">Project names required</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Send an email to the team requesting the full list of affected project names. You'll enter them below once received.
                          </p>
                          <button
                            type="button"
                            onClick={onSendScopeEmail}
                            disabled={sendingEmail}
                            className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-60"
                          >
                            {sendingEmail ? <ButtonSpinner /> : <EnvelopeIcon className="w-4 h-4" />}
                            {sendingEmail ? 'Sending…' : 'Send Email'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <CheckIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs font-medium">Email sent — enter the project names below to unlock submission.</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Names / Server URLs <span className="text-red-500">*</span>
                        {!emailSent && <span className="ml-1 text-xs text-gray-400 font-normal">— send the email first</span>}
                      </label>
                      <textarea
                        {...register('multi_project_names', {
                          validate: v => watchedScope !== 'multiple' || !!v?.trim() || 'Enter project names to proceed',
                        })}
                        disabled={!emailSent}
                        rows={3}
                        className={`${inputCls(errors.multi_project_names)} resize-none disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        placeholder={emailSent ? 'e.g. Neutara Platform, Neutara Mobile, Billing Service…' : 'Waiting for email to be sent…'}
                      />
                      {errMsg(errors.multi_project_names?.message)}
                    </div>
                  </div>
                )}
              </div>
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
            <button
              type="button"
              onClick={onSubmitToQA}
              disabled={submitting || submitBlocked}
              title={submitBlocked ? 'Send the scope email and enter project names to proceed' : undefined}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? <ButtonSpinner /> : <PaperAirplaneIcon className="w-4 h-4" />}
              Submit to QA
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
