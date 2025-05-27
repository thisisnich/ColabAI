'use client';
import { api } from '@workspace/backend/convex/_generated/api';
import { useSessionMutation, useSessionQuery } from 'convex-helpers/react/sessions';
import { useMutation, useQuery } from 'convex/react';
import { AlertTriangle, Check, CreditCard, TrendingUp, Zap } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

// Type definitions for better type safety
interface TokenStats {
  totalTokensUsed: number;
  monthlyTokensUsed: number;
  monthlyLimit: number;
  purchasedTokens: number;
  availableTokens: number;
  lastResetDate: string;
  recentUsage: Array<{
    _id: string;
    command: string;
    tokensUsed: number;
    timestamp: number;
    cost?: number;
    inputTokens?: number;
    outputTokens?: number;
  }>;
  monthlyPurchases: Array<{
    _id: string;
    tokensAdded: number;
    amountPaid: number;
    paymentProvider: string;
    timestamp: number;
  }>;
}

interface TokenPackage {
  id: number;
  tokens: number;
  price: number;
  popular: boolean;
}

const TokenDashboard: React.FC = () => {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Get user's token statistics from Convex
  const tokenStats = useSessionQuery(api.tokens.getUserTokenStats, { limit: 10 });

  // Mutation for adding purchased tokens
  const addPurchasedTokens = useSessionMutation(api.tokens.addPurchasedTokens);

  // Mutation for initializing user tokens
  const initializeUserTokens = useSessionMutation(api.tokens.initializeUserTokensFromSession);

  // Auto-initialize tokens when getUserTokenStats returns null
  useEffect(() => {
    const handleInitialization = async () => {
      // Only initialize if we get null (not undefined which means loading)
      if (tokenStats === null && !isInitializing) {
        setIsInitializing(true);
        setInitializationError(null);

        try {
          await initializeUserTokens({});
          // The query will automatically refetch and get the new data
        } catch (error) {
          console.error('Failed to initialize user tokens:', error);
          setInitializationError(
            error instanceof Error ? error.message : 'Failed to initialize tokens'
          );
        } finally {
          setIsInitializing(false);
        }
      }
    };

    handleInitialization();
  }, [tokenStats, initializeUserTokens, isInitializing]);

  // Token packages for purchase
  const tokenPackages: TokenPackage[] = [
    { tokens: 10000, price: 99, popular: false, id: 1 }, // $0.99 — Entry level
    { tokens: 50000, price: 249, popular: true, id: 2 }, // $2.49 — $0.000049/token
    { tokens: 100000, price: 399, popular: false, id: 3 }, // $3.99 — $0.000039/token
    { tokens: 250000, price: 699, popular: false, id: 4 }, // $6.99 — $0.000028/token
    { tokens: 500000, price: 1199, popular: false, id: 5 }, // $11.99 — $0.000024/token
    { tokens: 1000000, price: 1999, popular: true, id: 6 }, // $19.99 — $0.000019/token
  ];

  // Loading state (undefined means still loading from Convex)
  if (tokenStats === undefined) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-600 mt-4">Loading token statistics...</p>
        </div>
      </div>
    );
  }

  // Initializing state (null means needs initialization)
  if (tokenStats === null || isInitializing) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          {initializationError ? (
            <div className="max-w-md mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <h3 className="text-red-800 font-medium mb-2">Initialization Failed</h3>
                <p className="text-red-700 text-sm mb-4">{initializationError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setInitializationError(null);
                    setIsInitializing(false);
                    // This will trigger the useEffect again
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry Initialization
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <p className="text-gray-600 mt-4">
                {isInitializing ? 'Initializing token tracking...' : 'Setting up your account...'}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const usagePercentage = (tokenStats.monthlyTokensUsed / tokenStats.monthlyLimit) * 100;
  const isRunningLow = tokenStats.availableTokens < 5000;

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handlePurchase = (packageInfo: TokenPackage): void => {
    setSelectedPackage(packageInfo);
    setShowPurchaseModal(true);
    setPurchaseError(null);
    setPurchaseSuccess(false);
  };

  const processPurchase = async (): Promise<void> => {
    if (!selectedPackage) return;

    setIsProcessingPurchase(true);
    setPurchaseError(null);

    try {
      // In a real implementation, you'd integrate with Stripe or another payment processor here
      // For now, we'll simulate a successful purchase
      await addPurchasedTokens({
        tokensAdded: selectedPackage.tokens,
        amountPaid: selectedPackage.price,
        paymentProvider: 'demo', // In production: 'stripe', 'paypal', etc.
        paymentId: `demo_${Date.now()}`, // In real app, this would come from payment processor
      });

      setPurchaseSuccess(true);

      // Close modal after showing success
      setTimeout(() => {
        setShowPurchaseModal(false);
        setSelectedPackage(null);
        setPurchaseSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Purchase failed:', error);
      setPurchaseError(error instanceof Error ? error.message : 'Purchase failed');
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  const closeModal = (): void => {
    if (!isProcessingPurchase) {
      setShowPurchaseModal(false);
      setSelectedPackage(null);
      setPurchaseError(null);
      setPurchaseSuccess(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Token Usage Dashboard</h1>
        <p className="text-gray-600">Monitor your AI token consumption and manage your account</p>
      </div>

      {/* Alert for low tokens */}
      {isRunningLow && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <div>
            <h3 className="text-orange-800 font-medium">Low Token Balance</h3>
            <p className="text-orange-700 text-sm">
              You have {tokenStats.availableTokens.toLocaleString()} tokens remaining. Consider
              purchasing more to avoid service interruption.
            </p>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Tokens</p>
              <p className="text-2xl font-bold text-green-600">
                {tokenStats.availableTokens.toLocaleString()}
              </p>
            </div>
            <Zap className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Usage</p>
              <p className="text-2xl font-bold text-blue-600">
                {tokenStats.monthlyTokensUsed.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">of {tokenStats.monthlyLimit.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{usagePercentage.toFixed(1)}% used</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Used</p>
              <p className="text-2xl font-bold text-purple-600">
                {tokenStats.totalTokensUsed.toLocaleString()}
              </p>
            </div>
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold text-sm">∑</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Purchased Tokens</p>
              <p className="text-2xl font-bold text-orange-600">
                {tokenStats.purchasedTokens.toLocaleString()}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Usage</h2>
          </div>
          <div className="p-6">
            {tokenStats.recentUsage && tokenStats.recentUsage.length > 0 ? (
              <div className="space-y-4">
                {tokenStats.recentUsage.map((usage, index) => (
                  <div
                    key={usage._id || index}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          usage.command === 'deepseek' ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{usage.command}</p>
                        <p className="text-sm text-gray-500">{formatDate(usage.timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {usage.tokensUsed.toLocaleString()}
                      </p>
                      {usage.cost && usage.cost > 0 && (
                        <p className="text-sm text-gray-500">{formatCurrency(usage.cost)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No usage history yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Purchase Tokens */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Purchase Additional Tokens</h2>
            <p className="text-sm text-gray-600 mt-1">
              Expand your AI capabilities with additional token packages
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {tokenPackages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md text-left ${
                    pkg.popular
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handlePurchase(pkg)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handlePurchase(pkg);
                    }
                  }}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 left-4 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      Popular
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {pkg.tokens.toLocaleString()} Tokens
                      </p>
                      <p className="text-sm text-gray-600">${(pkg.price / 100).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        ${(pkg.price / 100 / (pkg.tokens / 1000)).toFixed(3)}/1K tokens
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {purchaseSuccess ? 'Purchase Successful!' : 'Purchase Tokens'}
              </h3>
            </div>
            <div className="p-6">
              {purchaseSuccess ? (
                <div className="text-center py-6">
                  <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <p className="text-green-700 font-medium">
                    {selectedPackage.tokens.toLocaleString()} tokens added to your account!
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Tokens:</span>
                        <span className="font-semibold">
                          {selectedPackage.tokens.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-semibold">
                          ${(selectedPackage.price / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Note: This is a demo purchase. In production, you would be redirected to a
                      secure payment processor.
                    </p>
                  </div>

                  {purchaseError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 text-sm">{purchaseError}</p>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isProcessingPurchase}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={processPurchase}
                      disabled={isProcessingPurchase}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingPurchase ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          <span>Purchase</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenDashboard;
