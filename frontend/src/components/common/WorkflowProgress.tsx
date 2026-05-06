import React from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { DeploymentStatus } from '../../types';
import { WORKFLOW_STEPS, getWorkflowStep } from '../../utils/statusConfig';

export const WorkflowProgress: React.FC<{ status: DeploymentStatus }> = ({ status }) => {
  const currentStep = getWorkflowStep(status);
  const isFailed = ['rejected_by_qa', 'deployment_failed', 'issue_raised'].includes(status);

  return (
    <div className="w-full">
      <div className="flex items-center">
        {WORKFLOW_STEPS.map((step, index) => {
          const isCompleted = currentStep > step.step;
          const isCurrent = currentStep === step.step;
          const isLast = index === WORKFLOW_STEPS.length - 1;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                  ${isCompleted ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent && isFailed ? 'bg-red-500 border-red-500 text-white'
                    : isCurrent ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-white border-gray-300 text-gray-400'}`}>
                  {isCompleted ? <CheckIcon className="w-4 h-4" />
                    : isCurrent && isFailed ? <XMarkIcon className="w-4 h-4" />
                    : step.step}
                </div>
                <span className={`mt-1.5 text-xs text-center max-w-[80px] leading-tight
                  ${isCompleted ? 'text-green-600 font-medium'
                    : isCurrent ? 'text-blue-700 font-semibold'
                    : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all
                  ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {isFailed && (
        <div className="mt-3 text-center">
          <span className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
            ✗ {status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>
      )}
    </div>
  );
};
