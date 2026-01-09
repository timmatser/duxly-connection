import { BlockStack, Text, Box } from '@shopify/polaris';

/**
 * Checkmark icon for completed steps
 */
function CheckmarkIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.5 5.5L7.5 14.5L3.5 10.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Step indicator circle
 */
function StepIndicator({ stepNumber, status }) {
  const statusStyles = {
    completed: { backgroundColor: '#22C55E', borderColor: '#22C55E', boxShadow: 'none' },
    active: { backgroundColor: '#4F46E5', borderColor: '#4F46E5', boxShadow: '0 0 0 4px rgba(79, 70, 229, 0.2)' },
    pending: { backgroundColor: '#E5E7EB', borderColor: '#D1D5DB', boxShadow: 'none' },
  };

  const { backgroundColor, borderColor, boxShadow } = statusStyles[status] || statusStyles.pending;

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        backgroundColor,
        border: `2px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.3s ease',
        boxShadow,
      }}
    >
      {status === 'completed' ? (
        <CheckmarkIcon size={18} />
      ) : (
        <span
          style={{
            color: status === 'pending' ? '#9CA3AF' : 'white',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {stepNumber}
        </span>
      )}
    </div>
  );
}

/**
 * Connector line between steps
 */
function StepConnector({ isCompleted }) {
  return (
    <div
      style={{
        flex: 1,
        height: 3,
        backgroundColor: isCompleted ? '#22C55E' : '#E5E7EB',
        margin: '0 8px',
        borderRadius: 2,
        transition: 'background-color 0.3s ease',
      }}
    />
  );
}

/**
 * Individual step component
 */
function TimelineStep({ step }) {
  const { title, description, status } = step;

  const titleColors = {
    completed: '#22C55E',
    active: '#4F46E5',
    pending: '#6B7280',
  };
  const titleColor = titleColors[status] || titleColors.pending;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
      }}
    >
      <Text
        variant="bodySm"
        fontWeight={status === 'active' ? 'semibold' : 'regular'}
        as="p"
      >
        <span style={{ color: titleColor }}>{title}</span>
      </Text>
      <div style={{ height: 4 }} />
      <Text variant="bodySm" tone="subdued" alignment="center" as="p">
        {description}
      </Text>
    </div>
  );
}

/**
 * OnboardingTimeline component
 * Displays a visual stepper showing integration progress
 *
 * @param {Object} props
 * @param {string} props.currentStep - Current step ID ('credentials' | 'integration' | 'active')
 */
function OnboardingTimeline({ currentStep = 'active' }) {
  const steps = [
    {
      id: 'credentials',
      title: 'Credentials Secured',
      description: 'API keys stored safely',
    },
    {
      id: 'integration',
      title: 'Integration Build',
      description: 'Systems connected',
    },
    {
      id: 'active',
      title: 'Active',
      description: 'Ready to sync',
    },
  ];

  // Determine status for each step based on currentStep
  const getStepStatus = (stepIndex) => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const stepsWithStatus = steps.map((step, index) => ({
    ...step,
    status: getStepStatus(index),
  }));

  return (
    <Box
      padding="500"
      background="bg-surface"
      borderRadius="300"
      borderColor="border"
      borderWidth="025"
    >
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Integration Progress
        </Text>

        {/* Step indicators with connectors */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 0',
          }}
        >
          {stepsWithStatus.map((step, index) => (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                flex: index === stepsWithStatus.length - 1 ? 0 : 1,
              }}
            >
              <StepIndicator
                stepNumber={index + 1}
                status={step.status}
              />
              {index < stepsWithStatus.length - 1 && (
                <StepConnector
                  isCompleted={step.status === 'completed'}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step labels */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          {stepsWithStatus.map((step) => (
            <TimelineStep key={step.id} step={step} />
          ))}
        </div>
      </BlockStack>
    </Box>
  );
}

export default OnboardingTimeline;
