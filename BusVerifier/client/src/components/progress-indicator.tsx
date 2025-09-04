import { Upload, Settings, Play, BarChart3 } from "lucide-react";

interface ProgressIndicatorProps {
  currentStep: number;
}

const steps = [
  { number: 1, label: "Choose", icon: Settings },
  { number: 2, label: "Upload", icon: Upload },
  { number: 3, label: "Process", icon: Play },
  { number: 4, label: "Results", icon: BarChart3 },
];

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-8 relative">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          
          return (
            <div key={step.number} className="flex items-center">
              <div className="flex items-center">
                <div
                  className={`progress-step ${
                    isActive ? 'active' : isCompleted ? 'completed' : ''
                  }`}
                  data-testid={`progress-step-${step.number}`}
                >
                  <Icon size={16} />
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`progress-line ml-4 w-16 ${
                      isCompleted ? 'completed' : isActive ? 'active' : ''
                    }`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        {steps.map((step) => (
          <span key={step.number} data-testid={`progress-label-${step.number}`}>
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}
