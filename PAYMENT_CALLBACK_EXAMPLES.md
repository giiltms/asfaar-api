# Payment Callback URL Enhancement

## 🎯 **Enhanced Callback URLs with Payment Type Information**

The payment system now includes payment type information in callback URLs, allowing the frontend to know exactly what type of payment was made and handle it appropriately.

---

## 📋 **Payment Types Available**

Based on the `FeeType` enum:

- **`ONBOARDING`** - User registration/onboarding fees
- **`APPLICATION`** - Form submission/application fees
- **`UPGRADE`** - Service upgrade fees
- **`RESCHEDULING`** - Appointment rescheduling fees
- **`ADDITIONAL_CHARGE`** - Additional service charges

---

## 🔗 **Enhanced Callback URL Structure**

### **Base URL:**

```
https://your-frontend.com/payments/callback
```

### **Enhanced URL with Payment Type:**

```
https://your-frontend.com/payments/callback?paymentType=application&feeTypes=application,additional_charge
```

### **URL Parameters:**

- **`paymentType`** - Primary payment type (first fee type in the payment)
- **`feeTypes`** - Comma-separated list of all fee types in the payment

---

## 🚀 **Frontend Implementation Examples**

### **1. React Router Handler**

```typescript
// src/pages/PaymentCallback.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface PaymentCallbackData {
  reference: string;
  status: 'success' | 'failed' | 'pending';
  paymentType: string;
  feeTypes: string[];
  amount: number;
  currency: string;
}

const PaymentCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handlePaymentCallback = async () => {
      try {
        // Extract payment type information from URL
        const paymentType = searchParams.get('paymentType');
        const feeTypes = searchParams.get('feeTypes')?.split(',') || [];
        const reference = searchParams.get('reference');
        const status = searchParams.get('status');

        if (!reference) {
          throw new Error('Payment reference not found');
        }

        // Verify payment with backend
        const response = await fetch(`/api/v1/payments/${reference}/verify`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        const paymentData: PaymentCallbackData = await response.json();

        // Handle different payment types
        await handlePaymentByType(paymentData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    handlePaymentCallback();
  }, [searchParams, navigate]);

  const handlePaymentByType = async (paymentData: PaymentCallbackData) => {
    const { paymentType, feeTypes, status } = paymentData;

    switch (paymentType) {
      case 'onboarding':
        await handleOnboardingPayment(paymentData);
        break;

      case 'application':
        await handleApplicationPayment(paymentData);
        break;

      case 'upgrade':
        await handleUpgradePayment(paymentData);
        break;

      case 'rescheduling':
        await handleReschedulingPayment(paymentData);
        break;

      case 'additional_charge':
        await handleAdditionalChargePayment(paymentData);
        break;

      default:
        await handleGenericPayment(paymentData);
    }
  };

  const handleOnboardingPayment = async (data: PaymentCallbackData) => {
    if (data.status === 'success') {
      // Update user onboarding status
      await fetch('/api/v1/user/onboarding-complete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentReference: data.reference,
          onboardingPaid: true,
        }),
      });

      // Redirect to dashboard or next step
      navigate('/dashboard?onboarding=complete');
    } else {
      navigate('/onboarding?payment=failed');
    }
  };

  const handleApplicationPayment = async (data: PaymentCallbackData) => {
    if (data.status === 'success') {
      // Update application status
      await fetch('/api/v1/submissions/payment-complete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentReference: data.reference,
          status: 'PAYMENT_COMPLETE',
        }),
      });

      // Redirect to application status page
      navigate('/applications?payment=success');
    } else {
      navigate('/applications?payment=failed');
    }
  };

  const handleUpgradePayment = async (data: PaymentCallbackData) => {
    if (data.status === 'success') {
      // Update user subscription/upgrade status
      await fetch('/api/v1/user/upgrade-complete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentReference: data.reference,
          upgradeType: feeTypes[0],
        }),
      });

      navigate('/dashboard?upgrade=success');
    } else {
      navigate('/upgrade?payment=failed');
    }
  };

  const handleReschedulingPayment = async (data: PaymentCallbackData) => {
    if (data.status === 'success') {
      // Update appointment status
      await fetch('/api/v1/appointments/reschedule-complete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentReference: data.reference,
          rescheduled: true,
        }),
      });

      navigate('/appointments?reschedule=success');
    } else {
      navigate('/appointments?reschedule=failed');
    }
  };

  const handleAdditionalChargePayment = async (data: PaymentCallbackData) => {
    if (data.status === 'success') {
      // Handle additional charges
      await fetch('/api/v1/payments/additional-charge-complete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentReference: data.reference,
          chargeType: feeTypes[0],
        }),
      });

      navigate('/dashboard?charge=success');
    } else {
      navigate('/dashboard?charge=failed');
    }
  };

  const handleGenericPayment = async (data: PaymentCallbackData) => {
    // Generic payment handling
    if (data.status === 'success') {
      navigate('/dashboard?payment=success');
    } else {
      navigate('/dashboard?payment=failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Payment Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PaymentCallback;
```

### **2. Vue.js Router Handler**

```typescript
// src/views/PaymentCallback.vue
<template>
  <div class="payment-callback">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Processing payment...</p>
    </div>

    <div v-else-if="error" class="error">
      <div class="error-icon">⚠️</div>
      <h2>Payment Error</h2>
      <p>{{ error }}</p>
      <button @click="goToDashboard">Return to Dashboard</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface PaymentData {
  reference: string;
  status: 'success' | 'failed' | 'pending';
  paymentType: string;
  feeTypes: string[];
  amount: number;
  currency: string;
}

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref<string | null>(null);

const handlePaymentCallback = async () => {
  try {
    const paymentType = route.query.paymentType as string;
    const feeTypes = (route.query.feeTypes as string)?.split(',') || [];
    const reference = route.query.reference as string;
    const status = route.query.status as string;

    if (!reference) {
      throw new Error('Payment reference not found');
    }

    // Verify payment
    const response = await fetch(`/api/v1/payments/${reference}/verify`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    const paymentData: PaymentData = await response.json();
    await handlePaymentByType(paymentData);

  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const handlePaymentByType = async (data: PaymentData) => {
  const { paymentType, status } = data;

  switch (paymentType) {
    case 'onboarding':
      await handleOnboardingPayment(data);
      break;
    case 'application':
      await handleApplicationPayment(data);
      break;
    case 'upgrade':
      await handleUpgradePayment(data);
      break;
    case 'rescheduling':
      await handleReschedulingPayment(data);
      break;
    case 'additional_charge':
      await handleAdditionalChargePayment(data);
      break;
    default:
      await handleGenericPayment(data);
  }
};

const handleOnboardingPayment = async (data: PaymentData) => {
  if (data.status === 'success') {
    await fetch('/api/v1/user/onboarding-complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentReference: data.reference,
        onboardingPaid: true,
      }),
    });
    router.push('/dashboard?onboarding=complete');
  } else {
    router.push('/onboarding?payment=failed');
  }
};

// ... other payment handlers

const goToDashboard = () => {
  router.push('/dashboard');
};

onMounted(() => {
  handlePaymentCallback();
});
</script>
```

### **3. Angular Router Handler**

```typescript
// src/app/pages/payment-callback/payment-callback.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../services/payment.service';

interface PaymentCallbackData {
  reference: string;
  status: 'success' | 'failed' | 'pending';
  paymentType: string;
  feeTypes: string[];
  amount: number;
  currency: string;
}

@Component({
  selector: 'app-payment-callback',
  template: `
    <div class="payment-callback">
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Processing payment...</p>
      </div>

      <div *ngIf="error" class="error">
        <div class="error-icon">⚠️</div>
        <h2>Payment Error</h2>
        <p>{{ error }}</p>
        <button (click)="goToDashboard()">Return to Dashboard</button>
      </div>
    </div>
  `,
})
export class PaymentCallbackComponent implements OnInit {
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
  ) {}

  ngOnInit() {
    this.handlePaymentCallback();
  }

  async handlePaymentCallback() {
    try {
      const paymentType = this.route.snapshot.queryParams['paymentType'];
      const feeTypes =
        this.route.snapshot.queryParams['feeTypes']?.split(',') || [];
      const reference = this.route.snapshot.queryParams['reference'];
      const status = this.route.snapshot.queryParams['status'];

      if (!reference) {
        throw new Error('Payment reference not found');
      }

      // Verify payment
      const paymentData = await this.paymentService.verifyPayment(reference);
      await this.handlePaymentByType(paymentData);
    } catch (err) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  async handlePaymentByType(data: PaymentCallbackData) {
    const { paymentType, status } = data;

    switch (paymentType) {
      case 'onboarding':
        await this.handleOnboardingPayment(data);
        break;
      case 'application':
        await this.handleApplicationPayment(data);
        break;
      case 'upgrade':
        await this.handleUpgradePayment(data);
        break;
      case 'rescheduling':
        await this.handleReschedulingPayment(data);
        break;
      case 'additional_charge':
        await this.handleAdditionalChargePayment(data);
        break;
      default:
        await this.handleGenericPayment(data);
    }
  }

  async handleOnboardingPayment(data: PaymentCallbackData) {
    if (data.status === 'success') {
      await this.paymentService.completeOnboarding(data.reference);
      this.router.navigate(['/dashboard'], {
        queryParams: { onboarding: 'complete' },
      });
    } else {
      this.router.navigate(['/onboarding'], {
        queryParams: { payment: 'failed' },
      });
    }
  }

  // ... other payment handlers

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
```

---

## 📊 **Example Callback URLs by Payment Type**

### **Onboarding Payment:**

```
https://your-frontend.com/payments/callback?paymentType=onboarding&feeTypes=onboarding&reference=PAY_123456789&status=success
```

### **Application Payment:**

```
https://your-frontend.com/payments/callback?paymentType=application&feeTypes=application&reference=PAY_987654321&status=success
```

### **Mixed Payment (Application + Additional Charge):**

```
https://your-frontend.com/payments/callback?paymentType=application&feeTypes=application,additional_charge&reference=PAY_456789123&status=success
```

### **Upgrade Payment:**

```
https://your-frontend.com/payments/callback?paymentType=upgrade&feeTypes=upgrade&reference=PAY_789123456&status=success
```

### **Rescheduling Payment:**

```
https://your-frontend.com/payments/callback?paymentType=rescheduling&feeTypes=rescheduling&reference=PAY_321654987&status=success
```

---

## 🔧 **Backend Implementation**

The enhanced callback URLs are automatically generated in the payment initiation process:

```typescript
// In PaymentsController.initiatePayment()
const paymentTypes = [
  ...new Set(serviceFees.map((fee) => fee.feeType).filter(Boolean)),
];
const primaryPaymentType =
  paymentTypes.length > 0 ? paymentTypes[0] : 'UNKNOWN';

const baseCallbackUrl = this.configService.get('payment.PAYMENT_CALLBACK_URL');
const enhancedCallbackUrl = `${baseCallbackUrl}?paymentType=${primaryPaymentType.toLowerCase()}&feeTypes=${paymentTypes
  .map((t) => t?.toLowerCase())
  .join(',')}`;
```

---

## 🎯 **Benefits**

1. **🎯 Type-Specific Handling** - Frontend can handle different payment types appropriately
2. **🔄 Seamless User Experience** - Users are redirected to the right page based on payment type
3. **📊 Better Analytics** - Track payment success/failure by type
4. **🛡️ Error Handling** - Specific error handling for each payment type
5. **📱 Mobile-Friendly** - Works across all platforms and frameworks

---

## 🚀 **Next Steps**

1. **Update Frontend Routes** - Add payment callback handlers to your routing
2. **Test Payment Flows** - Test each payment type end-to-end
3. **Add Analytics** - Track payment success rates by type
4. **Error Handling** - Implement comprehensive error handling for each type
5. **User Notifications** - Send appropriate notifications based on payment type

This enhancement ensures your frontend can provide a seamless, type-aware payment experience! 🎉
