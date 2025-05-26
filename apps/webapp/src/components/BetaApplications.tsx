import { api } from '@workspace/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

interface FormData {
  email: string;
  fullName: string;
  company: string;
  role: string;
  teamSize: string;
  useCase: string;
  expectedUsage: string;
  referralSource: string;
}

const BetaApplicationForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    fullName: '',
    company: '',
    role: '',
    teamSize: '',
    useCase: '',
    expectedUsage: '',
    referralSource: '',
  });
  const [result, setResult] = useState<{ status: string; betaCode?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitApplication = useMutation(api.betaApplications.submitApplication);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await submitApplication({
        email: formData.email,
        fullName: formData.fullName,
        company: formData.company || undefined,
        role: formData.role,
        teamSize: formData.teamSize,
        useCase: formData.useCase,
        expectedUsage: formData.expectedUsage,
        referralSource: formData.referralSource || undefined,
      });

      setResult(response);
      setStep(4);
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Error submitting application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
      >
        Join Beta
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Join Our Beta</h2>
            <p className="text-gray-600">Step {step} of 3</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="fullName">
                  Full Name *
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="Company">
                  Company
                </label>
                <input
                  id="company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role">
                  Role *
                </label>
                <input
                  id="role"
                  type="text"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Product Manager, Developer, Founder"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!formData.fullName || !formData.email || !formData.role}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Team & Usage */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Team & Usage Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="team-size">
                  Team Size *
                </label>
                <select
                  id="team-size"
                  value={formData.teamSize}
                  onChange={(e) => handleInputChange('teamSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select team size</option>
                  <option value="1-5">1-5 people</option>
                  <option value="6-20">6-20 people</option>
                  <option value="21-50">21-50 people</option>
                  <option value="50+">50+ people</option>
                </select>
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="expected-usage"
                >
                  Expected Usage *
                </label>
                <select
                  id="expected-usage"
                  value={formData.expectedUsage}
                  onChange={(e) => handleInputChange('expectedUsage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select usage frequency</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Occasionally">Occasionally</option>
                </select>
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="referralSource"
                >
                  How did you hear about us?
                </label>
                <select
                  id="referralSource"
                  value={formData.referralSource}
                  onChange={(e) => handleInputChange('referralSource', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select source</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Friend/Colleague">Friend/Colleague</option>
                  <option value="Search Engine">Search Engine</option>
                  <option value="Tech Blog">Tech Blog</option>
                  <option value="Conference/Event">Conference/Event</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!formData.teamSize || !formData.expectedUsage}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Use Case */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Tell Us About Your Use Case</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="useCase">
                  How do you plan to use our platform? *
                </label>
                <textarea
                  id="useCase"
                  value={formData.useCase}
                  onChange={(e) => handleInputChange('useCase', e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your specific use case, what problems you're trying to solve, and what success would look like for your team..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.useCase.length}/500 characters - Be specific for faster approval!
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!formData.useCase || isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Application'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 4 && result && (
            <div className="text-center space-y-4">
              <AlertCircle className="w-16 h-16 text-blue-500 mx-auto" />
              <h3 className="text-2xl font-bold text-blue-700">Application Received!</h3>
              <p className="text-gray-600">
                Thanks for your interest! We're reviewing applications and will get back to you
                soon. Keep an eye on your inbox for updates.
              </p>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BetaApplicationForm;
