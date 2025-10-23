# Bank Listing API - Sample Responses

## Overview

This document provides comprehensive sample responses for the bank listing API endpoint, showing examples for different countries and scenarios.

---

## Endpoint

```
GET /payments/banks
```

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|--------------|
| `country` | string | No | `nigeria` | Country code to filter banks |

### Supported Countries

- `nigeria` - Nigerian banks (default)
- `ghana` - Ghanaian banks  
- `kenya` - Kenyan banks
- `south-africa` - South African banks

---

## Sample Responses

### 1. Nigerian Banks (Default)

**Request:**
```http
GET /payments/banks
```

**Response:**
```json
{
  "success": true,
  "message": "Banks retrieved successfully",
  "data": [
    {
      "name": "Access Bank",
      "code": "044",
      "country": "Nigeria"
    },
    {
      "name": "First Bank of Nigeria",
      "code": "011",
      "country": "Nigeria"
    },
    {
      "name": "Guaranty Trust Bank",
      "code": "058",
      "country": "Nigeria"
    },
    {
      "name": "Zenith Bank",
      "code": "057",
      "country": "Nigeria"
    },
    {
      "name": "United Bank for Africa",
      "code": "033",
      "country": "Nigeria"
    },
    {
      "name": "Polaris Bank",
      "code": "076",
      "country": "Nigeria"
    },
    {
      "name": "Fidelity Bank",
      "code": "070",
      "country": "Nigeria"
    },
    {
      "name": "Union Bank of Nigeria",
      "code": "032",
      "country": "Nigeria"
    },
    {
      "name": "Wema Bank",
      "code": "035",
      "country": "Nigeria"
    },
    {
      "name": "Sterling Bank",
      "code": "232",
      "country": "Nigeria"
    }
  ],
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### 2. Ghanaian Banks

**Request:**
```http
GET /payments/banks?country=ghana
```

**Response:**
```json
{
  "success": true,
  "message": "Banks retrieved successfully",
  "data": [
    {
      "name": "Ghana Commercial Bank",
      "code": "001",
      "country": "Ghana"
    },
    {
      "name": "Ecobank Ghana",
      "code": "021",
      "country": "Ghana"
    },
    {
      "name": "Standard Chartered Bank Ghana",
      "code": "002",
      "country": "Ghana"
    },
    {
      "name": "Absa Bank Ghana",
      "code": "003",
      "country": "Ghana"
    },
    {
      "name": "Fidelity Bank Ghana",
      "code": "004",
      "country": "Ghana"
    }
  ],
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### 3. Kenyan Banks

**Request:**
```http
GET /payments/banks?country=kenya
```

**Response:**
```json
{
  "success": true,
  "message": "Banks retrieved successfully",
  "data": [
    {
      "name": "Equity Bank Kenya",
      "code": "068",
      "country": "Kenya"
    },
    {
      "name": "KCB Bank Kenya",
      "code": "001",
      "country": "Kenya"
    },
    {
      "name": "Cooperative Bank of Kenya",
      "code": "011",
      "country": "Kenya"
    },
    {
      "name": "Absa Bank Kenya",
      "code": "031",
      "country": "Kenya"
    },
    {
      "name": "Standard Chartered Bank Kenya",
      "code": "002",
      "country": "Kenya"
    }
  ],
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### 4. South African Banks

**Request:**
```http
GET /payments/banks?country=south-africa
```

**Response:**
```json
{
  "success": true,
  "message": "Banks retrieved successfully",
  "data": [
    {
      "name": "Standard Bank",
      "code": "051",
      "country": "South Africa"
    },
    {
      "name": "First National Bank",
      "code": "250655",
      "country": "South Africa"
    },
    {
      "name": "Absa Bank",
      "code": "632005",
      "country": "South Africa"
    },
    {
      "name": "Nedbank",
      "code": "198765",
      "country": "South Africa"
    },
    {
      "name": "Capitec Bank",
      "code": "470010",
      "country": "South Africa"
    }
  ],
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

---

## Error Responses

### 1. Invalid Country Parameter

**Request:**
```http
GET /payments/banks?country=invalid
```

**Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": 400000,
    "message": "Country must be one of: nigeria, ghana, kenya, south-africa",
    "details": "Invalid country parameter provided"
  },
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### 2. Payment Provider Service Unavailable

**Request:**
```http
GET /payments/banks
```

**Response:**
```json
{
  "success": false,
  "message": "Failed to retrieve banks",
  "error": {
    "code": 500000,
    "message": "Payment provider service unavailable",
    "details": "Unable to connect to Paystack API"
  },
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### 3. No Banks Found

**Request:**
```http
GET /payments/banks?country=unsupported-country
```

**Response:**
```json
{
  "success": true,
  "message": "Banks retrieved successfully",
  "data": [],
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

---

## Usage Examples

### Frontend Integration

#### JavaScript/TypeScript

```typescript
// Fetch Nigerian banks (default)
const fetchBanks = async (country = 'nigeria') => {
  try {
    const response = await fetch(`/api/payments/banks?country=${country}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data; // Array of banks
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('Failed to fetch banks:', error);
    throw error;
  }
};

// Usage
const nigerianBanks = await fetchBanks();
const ghanaianBanks = await fetchBanks('ghana');
```

#### React Hook

```typescript
import { useState, useEffect } from 'react';

const useBanks = (country = 'nigeria') => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBanks = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/payments/banks?country=${country}`);
        const data = await response.json();
        
        if (data.success) {
          setBanks(data.data);
        } else {
          setError(data.error.message);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBanks();
  }, [country]);

  return { banks, loading, error };
};

// Usage in component
const BankSelector = ({ country = 'nigeria' }) => {
  const { banks, loading, error } = useBanks(country);

  if (loading) return <div>Loading banks...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <select>
      <option value="">Select a bank</option>
      {banks.map(bank => (
        <option key={bank.code} value={bank.code}>
          {bank.name}
        </option>
      ))}
    </select>
  );
};
```

#### Vue.js

```javascript
// Vue 3 Composition API
import { ref, onMounted } from 'vue';

export default {
  setup() {
    const banks = ref([]);
    const loading = ref(false);
    const error = ref(null);

    const fetchBanks = async (country = 'nigeria') => {
      loading.value = true;
      error.value = null;
      
      try {
        const response = await fetch(`/api/payments/banks?country=${country}`);
        const data = await response.json();
        
        if (data.success) {
          banks.value = data.data;
        } else {
          error.value = data.error.message;
        }
      } catch (err) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchBanks();
    });

    return { banks, loading, error, fetchBanks };
  }
};
```

---

## Testing

### cURL Examples

```bash
# Get Nigerian banks (default)
curl -X GET "https://api.example.com/payments/banks"

# Get Ghanaian banks
curl -X GET "https://api.example.com/payments/banks?country=ghana"

# Get Kenyan banks
curl -X GET "https://api.example.com/payments/banks?country=kenya"

# Get South African banks
curl -X GET "https://api.example.com/payments/banks?country=south-africa"

# Test invalid country (should return error)
curl -X GET "https://api.example.com/payments/banks?country=invalid"
```

### Postman Collection

```json
{
  "info": {
    "name": "Bank Listing API",
    "description": "Sample requests for bank listing endpoint"
  },
  "item": [
    {
      "name": "Get Nigerian Banks",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/payments/banks"
      }
    },
    {
      "name": "Get Ghanaian Banks",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/payments/banks?country=ghana"
      }
    },
    {
      "name": "Get Kenyan Banks",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/payments/banks?country=kenya"
      }
    },
    {
      "name": "Get South African Banks",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/payments/banks?country=south-africa"
      }
    }
  ]
}
```

---

## Notes

- **Default Country**: If no country is specified, Nigerian banks are returned by default
- **Bank Codes**: Bank codes are unique identifiers used for account verification
- **Country Names**: Country names in responses are properly formatted (e.g., "Nigeria", not "nigeria")
- **Empty Results**: If a country has no supported banks, an empty array is returned
- **Error Handling**: Always check the `success` field before processing the `data` field
- **Rate Limiting**: The endpoint may be rate-limited based on your API plan

---

_Last Updated: January 2025_  
_Version: 1.0.0_
