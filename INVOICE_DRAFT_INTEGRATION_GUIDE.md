# Invoice Draft System - Frontend Integration Guide

## � IMPORTANT: Workflow & Endpoint Usage

### Two Ways to Create an Invoice from Draft:

#### 1. **DIRECT FINALIZATION** (Recommended for most cases)
- **Status Required**: `DRAFT`
- **Endpoint**: `POST /invoice-drafts/{id}/finalize`
- **Use When**: You want to create an invoice immediately without approval workflow
- **Result**: Draft status becomes `APPROVED` and invoice is created instantly

#### 2. **APPROVAL WORKFLOW**
- **Step 1**: Submit for approval: `POST /invoice-drafts/{id}/submit` (DRAFT → PENDING_APPROVAL)
- **Step 2**: Approve: `POST /invoice-drafts/{id}/approve` (PENDING_APPROVAL → APPROVED)
- **Use When**: Your business requires approval before creating invoices

### ⚠️ Common Frontend Mistakes to Avoid:
- ❌ **DON'T** call `/approve` on drafts with `DRAFT` status
- ❌ **DON'T** call `/finalize` on drafts with `PENDING_APPROVAL` status
- ✅ **DO** use `/finalize` for instant invoice creation from `DRAFT` status
- ✅ **DO** use `/approve` only after `/submit` (when status is `PENDING_APPROVAL`)

## �📋 Table of Contents
1. [Overview](#overview)
2. [Base URL & Authentication](#base-url--authentication)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Frontend Implementation Examples](#frontend-implementation-examples)
6. [Error Handling](#error-handling)
7. [TypeScript Interfaces](#typescript-interfaces)
8. [Workflow Implementation](#workflow-implementation)

## 🎯 Overview

Invoice Draft System allows you to:
- ✅ Create drafts directly using storeId (no saleId required)
- ✅ Edit drafts with version control
- ✅ Submit drafts for approval
- ✅ Approve/Reject drafts
- ✅ Convert existing invoices to drafts
- ✅ View version history

## 🔐 Base URL & Authentication

```typescript
const BASE_URL = 'https://your-api-domain.com/api/v1';

// Headers for all requests
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

## 📡 API Endpoints

### 1. Create Invoice Draft
```http
POST /invoice-drafts
```

### 2. Get All Drafts (with filtering)
```http
GET /invoice-drafts?page=1&limit=20&status=DRAFT&storeId=store-uuid
```

### 3. Get Draft by ID
```http
GET /invoice-drafts/{draftId}
```

### 4. Get Draft Status & Available Actions
```http
GET /invoice-drafts/{draftId}/status
```

### 5. Update Draft
```http
PUT /invoice-drafts/{draftId}
```

### 6. Delete Draft
```http
DELETE /invoice-drafts/{draftId}
```

### 7. Submit for Approval
```http
POST /invoice-drafts/{draftId}/submit
```

### 8. Approve Draft
```http
POST /invoice-drafts/{draftId}/approve
```

### 9. Reject Draft
```http
POST /invoice-drafts/{draftId}/reject
```

### 10. Get Version History
```http
GET /invoice-drafts/{draftId}/versions
```

### 11. Revert to Version
```http
POST /invoice-drafts/{draftId}/revert/{versionId}
```

### 12. Convert Invoice to Draft
```http
POST /invoices/{invoiceId}/convert-to-draft
```

### 13. Finalize Draft (Direct Invoice Creation)
```http
POST /invoice-drafts/{draftId}/finalize
```

## 📝 Request/Response Examples

### 1. Create Draft

**Request Body:**
```json
{
  "storeId": "store-uuid-123",
  "notes": "New invoice draft",
  "dueDate": "2025-08-15T00:00:00Z",
  "shippingAddress": "123 Main St, City",
  "customerId": "customer-uuid-456",
  "totalAmount": 1500.00,
  "netAmount": 1400.00,
  "tax": 100.00,
  "paymentMethod": "CASH",
  "cashierName": "John Doe",
  "customFields": [
    {
      "name": "VAT Number",
      "value": "123456789"
    },
    {
      "name": "PO Number", 
      "value": "PO-2025-001"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Draft created successfully",
  "data": {
    "id": "draft-uuid-789",
    "draftNumber": "DRAFT-20250718-001",
    "version": 1,
    "status": "DRAFT",
    "storeId": "store-uuid-123",
    "notes": "New invoice draft",
    "dueDate": "2025-08-15T00:00:00Z",
    "totalAmount": 1500.00,
    "netAmount": 1400.00,
    "tax": 100.00,
    "paymentMethod": "CASH",
    "cashierName": "John Doe",
    "store": {
      "id": "store-uuid-123",
      "name": "Main Store"
    },
    "customer": {
      "id": "customer-uuid-456",
      "customerName": "Jane Smith"
    },
    "customFields": [
      {
        "id": "field-uuid-1",
        "fieldName": "VAT Number",
        "fieldValue": "123456789"
      }
    ],
    "createdAt": "2025-07-18T10:00:00Z",
    "updatedAt": "2025-07-18T10:00:00Z"
  },
  "status": 201,
  "timestamp": "2025-07-18T10:00:00Z"
}
```

### 2. Get All Drafts with Filters

**URL with Query Parameters:**
```
GET /invoice-drafts?page=1&limit=10&status=DRAFT&storeId=store-uuid-123&search=DRAFT-2025
```

**Response:**
```json
{
  "success": true,
  "message": "Drafts retrieved successfully",
  "data": {
    "drafts": [
      {
        "id": "draft-uuid-789",
        "draftNumber": "DRAFT-20250718-001",
        "version": 1,
        "status": "DRAFT",
        "storeId": "store-uuid-123",
        "totalAmount": 1500.00,
        "customer": {
          "customerName": "Jane Smith"
        },
        "store": {
          "name": "Main Store"
        },
        "createdAt": "2025-07-18T10:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "status": 200,
  "timestamp": "2025-07-18T10:05:00Z"
}
```

### 3. Update Draft

**Request Body:**
```json
{
  "notes": "Updated draft notes",
  "totalAmount": 1600.00,
  "netAmount": 1500.00,
  "tax": 100.00,
  "customFields": [
    {
      "name": "VAT Number",
      "value": "987654321"
    }
  ]
}
```

### 4. Submit for Approval

**Request Body:**
```json
{
  "notes": "Ready for manager review"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Draft submitted for approval",
  "data": {
    "id": "draft-uuid-789",
    "status": "PENDING_APPROVAL",
    "submittedForApprovalAt": "2025-07-18T11:00:00Z",
    "submittedBy": "user-uuid-123"
  },
  "status": 200,
  "timestamp": "2025-07-18T11:00:00Z"
}
```

### 5. Approve Draft

**Request Body:**
```json
{
  "notes": "Approved - looks good"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Draft approved and invoice created",
  "data": {
    "draft": {
      "id": "draft-uuid-789",
      "status": "APPROVED",
      "approvedAt": "2025-07-18T12:00:00Z",
      "approvedBy": "manager-uuid-456"
    },
    "invoice": {
      "id": "invoice-uuid-999",
      "invoiceNumber": "INV-20250718-001",
      "totalAmount": 1600.00,
      "status": "COMPLETED"
    }
  },
  "status": 200,
  "timestamp": "2025-07-18T12:00:00Z"
}
```

### 6. Reject Draft

**Request Body:**
```json
{
  "reason": "Missing customer information"
}
```

### 7. Convert Invoice to Draft

**Request Body:**
```json
{
  "notes": "Converting for editing"
}
```

### 8. Finalize Draft (Direct Invoice Creation)

**Request Body:**
```json
{
  "notes": "Finalizing draft - creating invoice"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Draft finalized and invoice created successfully",
  "data": {
    "draft": {
      "id": "draft-uuid-789",
      "status": "APPROVED",
      "approvedAt": "2025-07-18T12:00:00Z",
      "approvedBy": "user-uuid-456"
    },
    "invoice": {
      "id": "invoice-uuid-999",
      "invoiceNumber": "INV-20250718-001",
      "totalAmount": 1600.00,
      "status": "COMPLETED"
    }
  },
  "status": 200,
  "timestamp": "2025-07-18T12:00:00Z"
}
```

## 💻 Frontend Implementation Examples

### React/TypeScript Implementation

```typescript
// api/invoiceDraft.ts
class InvoiceDraftAPI {
  private baseURL = 'https://your-api-domain.com/api/v1';
  
  private getHeaders() {
    return {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      'Content-Type': 'application/json'
    };
  }

  // Create Draft
  async createDraft(data: CreateDraftRequest): Promise<ApiResponse<Draft>> {
    const response = await fetch(`${this.baseURL}/invoice-drafts`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  }

  // Get All Drafts
  async getDrafts(params: GetDraftsParams): Promise<ApiResponse<DraftsResponse>> {
    const queryString = new URLSearchParams(params as any).toString();
    const response = await fetch(`${this.baseURL}/invoice-drafts?${queryString}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Get Single Draft
  async getDraft(draftId: string): Promise<ApiResponse<Draft>> {
    const response = await fetch(`${this.baseURL}/invoice-drafts/${draftId}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Update Draft
  async updateDraft(draftId: string, data: UpdateDraftRequest): Promise<ApiResponse<Draft>> {
    const response = await fetch(`${this.baseURL}/invoice-drafts/${draftId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  }

  // Delete Draft
  async deleteDraft(draftId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${this.baseURL}/invoice-drafts/${draftId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Submit for Approval
  async submitDraft(draftId: string, notes?: string): Promise<ApiResponse<Draft>> {
    const response = await fetch(`${this.baseURL}/invoice-drafts/${draftId}/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ notes })
    });
    return response.json();
  }

  // Approve Draft
  async approveDraft(draftId: string, notes?: string): Promise<ApiResponse<ApprovalResponse>> {
    const response = await fetch(`${this.baseURL}/invoice-drafts/${draftId}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ notes })
    });
    return response.json();
  }

  // Reject Draft
  async rejectDraft(draftId: string, reason: string): Promise<ApiResponse<Draft>> {
    const response = await fetch(`${this.baseURL}/invoice-drafts/${draftId}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason })
    });
    return response.json();
  }

  // Get Version History
  async getVersionHistory(draftId: string): Promise<ApiResponse<VersionHistoryResponse>> {
    const response = await fetch(`${this.baseURL}/invoice-drafts/${draftId}/versions`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Revert to Version
  async revertToVersion(draftId: string, versionId: string): Promise<ApiResponse<Draft>> {
    const response = await fetch(`${this.baseURL}/invoice-drafts/${draftId}/revert/${versionId}`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Convert Invoice to Draft
  async convertInvoiceToDraft(invoiceId: string, notes?: string): Promise<ApiResponse<Draft>> {
    const response = await fetch(`${this.baseURL}/invoices/${invoiceId}/convert-to-draft`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ notes })
    });
    return response.json();
  }

  // Finalize Draft (Direct Invoice Creation)
  async finalizeDraft(draftId: string, notes?: string): Promise<ApiResponse<ApprovalResponse>> {
    const response = await fetch(`${this.baseURL}/invoice-drafts/${draftId}/finalize`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ notes })
    });
    return response.json();
  }
}

export const invoiceDraftAPI = new InvoiceDraftAPI();
```

### React Component Example

```tsx
// components/InvoiceDraftForm.tsx
import React, { useState } from 'react';
import { invoiceDraftAPI } from '../api/invoiceDraft';

interface InvoiceDraftFormProps {
  storeId: string;
  onSuccess: (draft: Draft) => void;
}

export const InvoiceDraftForm: React.FC<InvoiceDraftFormProps> = ({ storeId, onSuccess }) => {
  const [formData, setFormData] = useState<CreateDraftRequest>({
    storeId,
    notes: '',
    totalAmount: 0,
    netAmount: 0,
    tax: 0,
    paymentMethod: 'CASH',
    customFields: []
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await invoiceDraftAPI.createDraft(formData);
      if (response.success) {
        onSuccess(response.data);
      } else {
        alert('Error: ' + response.message);
      }
    } catch (error) {
      alert('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Notes:</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
        />
      </div>
      
      <div>
        <label>Total Amount:</label>
        <input
          type="number"
          value={formData.totalAmount}
          onChange={(e) => setFormData({...formData, totalAmount: parseFloat(e.target.value)})}
        />
      </div>

      <div>
        <label>Payment Method:</label>
        <select
          value={formData.paymentMethod}
          onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}
        >
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
        </select>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Draft'}
      </button>
    </form>
  );
};
```

### Enhanced Draft List Component with Proper Workflow

```tsx
// components/DraftList.tsx
import React, { useState, useEffect } from 'react';
import { invoiceDraftAPI } from '../api/invoiceDraft';

export const DraftList: React.FC = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<GetDraftsParams>({
    page: 1,
    limit: 20,
    status: undefined,
    search: ''
  });

  useEffect(() => {
    loadDrafts();
  }, [filters]);

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const response = await invoiceDraftAPI.getDrafts(filters);
      if (response.success) {
        setDrafts(response.data.drafts);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDraft = async (draftId: string, draft: Draft) => {
    if (draft.status !== 'DRAFT') {
      alert('Only draft status items can be submitted for approval');
      return;
    }

    try {
      const response = await invoiceDraftAPI.submitDraft(draftId, 'Ready for review');
      if (response.success) {
        loadDrafts(); // Refresh list
        alert('Draft submitted for approval');
      } else {
        handleApiError(response);
      }
    } catch (error) {
      alert('Error submitting draft');
    }
  };

  const handleApproveDraft = async (draftId: string, draft: Draft) => {
    if (draft.status !== 'PENDING_APPROVAL') {
      alert('Draft must be submitted for approval first');
      return;
    }

    try {
      const response = await invoiceDraftAPI.approveDraft(draftId, 'Approved');
      if (response.success) {
        loadDrafts(); // Refresh list
        alert(`Draft approved! Invoice created: ${response.data.invoice?.invoiceNumber || 'N/A'}`);
      } else {
        handleApiError(response);
      }
    } catch (error) {
      alert('Error approving draft');
    }
  };

  const handleRejectDraft = async (draftId: string, draft: Draft) => {
    if (draft.status !== 'PENDING_APPROVAL') {
      alert('Draft must be submitted for approval first');
      return;
    }

    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      const response = await invoiceDraftAPI.rejectDraft(draftId, reason);
      if (response.success) {
        loadDrafts(); // Refresh list
        alert('Draft rejected');
      } else {
        handleApiError(response);
      }
    } catch (error) {
      alert('Error rejecting draft');
    }
  };

  const handleFinalizeDraft = async (draftId: string, draft: Draft) => {
    if (draft.status !== 'DRAFT') {
      alert('Only draft status items can be finalized');
      return;
    }

    if (!confirm('Are you sure you want to finalize this draft? This will create an invoice immediately.')) return;

    try {
      const response = await invoiceDraftAPI.finalizeDraft(draftId, 'Finalized');
      if (response.success) {
        loadDrafts(); // Refresh list
        alert(`Draft finalized! Invoice created: ${response.data.invoice?.invoiceNumber || 'N/A'}`);
      } else {
        handleApiError(response);
      }
    } catch (error) {
      alert('Error finalizing draft');
    }
  };

  const handleEditDraft = (draftId: string, draft: Draft) => {
    if (draft.status !== 'DRAFT') {
      alert('Only draft status items can be edited');
      return;
    }
    // Navigate to edit page
    window.location.href = `/drafts/${draftId}/edit`;
  };

  const handleDeleteDraft = async (draftId: string, draft: Draft) => {
    if (draft.status !== 'DRAFT') {
      alert('Only draft status items can be deleted');
      return;
    }

    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      const response = await invoiceDraftAPI.deleteDraft(draftId);
      if (response.success) {
        loadDrafts(); // Refresh list
        alert('Draft deleted successfully');
      } else {
        handleApiError(response);
      }
    } catch (error) {
      alert('Error deleting draft');
    }
  };

  const handleApiError = (response: ApiResponse<any>) => {
    if (response.message.includes('PENDING_APPROVAL')) {
      alert('Draft must be submitted for approval first before it can be approved or rejected');
    } else if (response.message.includes('DRAFT status')) {
      alert('Only draft status items can be edited or deleted');
    } else {
      alert('Error: ' + response.message);
    }
  };

  const getActionButtons = (draft: Draft) => {
    switch (draft.status) {
      case 'DRAFT':
        return (
          <>
            <button 
              className="btn-success"
              onClick={() => handleFinalizeDraft(draft.id, draft)}
            >
              🚀 Finalize & Create Invoice
            </button>
            <button 
              className="btn-primary"
              onClick={() => handleSubmitDraft(draft.id, draft)}
            >
              Submit for Approval
            </button>
            <button 
              className="btn-secondary"
              onClick={() => handleEditDraft(draft.id, draft)}
            >
              Edit
            </button>
            <button 
              className="btn-danger"
              onClick={() => handleDeleteDraft(draft.id, draft)}
            >
              Delete
            </button>
          </>
        );
      
      case 'PENDING_APPROVAL':
        return (
          <>
            <button 
              className="btn-success"
              onClick={() => handleApproveDraft(draft.id, draft)}
            >
              Approve
            </button>
            <button 
              className="btn-warning"
              onClick={() => handleRejectDraft(draft.id, draft)}
            >
              Reject
            </button>
          </>
        );
      
      case 'APPROVED':
        return (
          <span className="status-text">✅ Approved - Invoice Created</span>
        );
      
      case 'REJECTED':
        return (
          <>
            <span className="status-text">❌ Rejected</span>
            <button 
              className="btn-secondary"
              onClick={() => handleEditDraft(draft.id, draft)}
            >
              Edit & Resubmit
            </button>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search drafts..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
        />
        
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters({...filters, status: e.target.value as DraftStatus})}
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Draft List */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="draft-list">
          {drafts.map((draft) => (
            <div key={draft.id} className="draft-card">
              <h3>{draft.draftNumber}</h3>
              <StatusBadge status={draft.status} />
              <p>Amount: ${draft.totalAmount}</p>
              <p>Store: {draft.store?.name}</p>
              <p>Customer: {draft.customer?.customerName || 'Walk-in'}</p>
              <p>Version: {draft.version}</p>
              <p>Created: {new Date(draft.createdAt).toLocaleDateString()}</p>
              
              {/* Status-specific timestamps */}
              {draft.submittedForApprovalAt && (
                <p>Submitted: {new Date(draft.submittedForApprovalAt).toLocaleDateString()}</p>
              )}
              {draft.approvedAt && (
                <p>Approved: {new Date(draft.approvedAt).toLocaleDateString()}</p>
              )}
              {draft.rejectedAt && (
                <p>Rejected: {new Date(draft.rejectedAt).toLocaleDateString()}</p>
              )}
              
              <div className="actions">
                {getActionButtons(draft)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## 🚫 Error Handling

### 🚨 Common Troubleshooting: "Only drafts with PENDING_APPROVAL status can be approved"

**Problem**: You're getting this error when trying to approve a draft.

**Root Cause**: You're calling the `/approve` endpoint on a draft with `DRAFT` status.

**Solution**: 
```typescript
// ❌ WRONG: Trying to approve a DRAFT status
if (draft.status === 'DRAFT') {
  // Don't call the approve endpoint!
  await invoiceDraftAPI.approveDraft(draftId); // This will fail!
}

// ✅ CORRECT: Use finalize for DRAFT status
if (draft.status === 'DRAFT') {
  // For instant invoice creation:
  await invoiceDraftAPI.finalizeDraft(draftId);
  
  // OR submit first if you need approval workflow:
  await invoiceDraftAPI.submitDraft(draftId);
  // Then later when status is PENDING_APPROVAL:
  await invoiceDraftAPI.approveDraft(draftId);
}
```

### 🚨 NEW: "Draft has APPROVED status" Error

**Problem**: You're getting this error when trying to finalize a draft.

**Root Cause**: You're trying to finalize a draft that's already been approved/finalized.

**Solution**: 
```typescript
// ✅ CORRECT: Check status before taking action
const checkDraftStatus = async (draftId: string) => {
  const response = await fetch(`${baseURL}/invoice-drafts/${draftId}/status`);
  const statusInfo = await response.json();
  
  console.log('Available actions:', statusInfo.data.availableActions);
  
  switch (statusInfo.data.currentStatus) {
    case 'DRAFT':
      // Can finalize, edit, submit, or delete
      break;
    case 'PENDING_APPROVAL':
      // Can approve or reject
      break;
    case 'APPROVED':
      // Already processed - show message to user
      alert('This draft has already been approved and an invoice has been created.');
      break;
    case 'REJECTED':
      // Can edit and resubmit
      break;
  }
};

// Use this before any action
await checkDraftStatus(draftId);
```

**Quick Fix for Your Frontend**:
```typescript
const createInvoiceFromDraft = async (draftId: string, draft: Draft) => {
  try {
    if (draft.status === 'DRAFT') {
      // Use finalize for direct invoice creation
      const response = await invoiceDraftAPI.finalizeDraft(draftId);
      alert('Invoice created successfully!');
    } else if (draft.status === 'PENDING_APPROVAL') {
      // Use approve for pending drafts
      const response = await invoiceDraftAPI.approveDraft(draftId);
      alert('Draft approved successfully!');
    } else {
      alert(`Cannot process draft with status: ${draft.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to process draft');
  }
};
```

### Error Response Format
```json
{
  "success": false,
  "message": "Draft not found",
  "data": null,
  "status": 404,
  "timestamp": "2025-07-18T10:00:00Z"
}
```

### Common Error Scenarios

```typescript
const handleApiError = (response: ApiResponse<any>) => {
  if (!response.success) {
    switch (response.status) {
      case 400:
        // Handle specific workflow errors
        if (response.message.includes('PENDING_APPROVAL')) {
          alert('Draft must be submitted for approval first before it can be approved or rejected');
        } else if (response.message.includes('DRAFT status')) {
          alert('Only draft status items can be edited or deleted');
        } else {
          alert('Invalid request: ' + response.message);
        }
        break;
      case 401:
        // Redirect to login
        window.location.href = '/login';
        break;
      case 403:
        alert('You do not have permission to perform this action');
        break;
      case 404:
        alert('Draft not found');
        break;
      case 500:
        alert('Server error. Please try again later.');
        break;
      default:
        alert('An error occurred: ' + response.message);
    }
  }
};
```

### ⚠️ **IMPORTANT: Draft Status Workflow**

**Two Ways to Create Invoice from Draft:**

#### Option 1: Direct Finalization (Recommended for Quick Workflow)
1. `DRAFT` → **Finalize Button** → `APPROVED` + Invoice Created

#### Option 2: Approval Workflow (For Team Approval Process)
1. `DRAFT` → Submit for Approval → `PENDING_APPROVAL` 
2. `PENDING_APPROVAL` → Approve/Reject → `APPROVED`/`REJECTED`
3. `APPROVED` → Invoice Created

**Draft Status Transitions:**
1. `DRAFT` → Can be edited, deleted, submitted for approval, or **finalized directly**
2. `PENDING_APPROVAL` → Can only be approved or rejected  
3. `APPROVED` → Final status, invoice is created
4. `REJECTED` → Returns to DRAFT status for editing

**Common Workflow Errors:**

#### 1. Trying to Approve/Reject a DRAFT status
```json
{
  "success": false,
  "message": "Only drafts with PENDING_APPROVAL status can be approved or rejected",
  "status": 400
}
```
**Solution:** Submit the draft for approval first using `/invoice-drafts/{id}/submit`

#### 2. Trying to Edit a PENDING_APPROVAL status
```json
{
  "success": false,
  "message": "Only drafts with DRAFT status can be updated",
  "status": 400
}
```
**Solution:** Either approve/reject it, or reject it to return to DRAFT status

#### 3. Trying to Delete a non-DRAFT status
```json
{
  "success": false,
  "message": "Only drafts with DRAFT status can be deleted",
  "status": 400
}
```
**Solution:** Only DRAFT status items can be deleted

### Workflow Error Handling Example

```typescript
// Enhanced workflow with proper error handling
const handleDraftAction = async (draftId: string, action: string, draft: Draft) => {
  try {
    let response;
    
    switch (action) {
      case 'edit':
        if (draft.status !== 'DRAFT') {
          alert('Only drafts can be edited. Current status: ' + draft.status);
          return;
        }
        // Proceed with edit
        break;
        
      case 'submit':
        if (draft.status !== 'DRAFT') {
          alert('Only draft status items can be submitted for approval');
          return;
        }
        response = await invoiceDraftAPI.submitDraft(draftId, 'Ready for review');
        break;
        
      case 'approve':
        if (draft.status !== 'PENDING_APPROVAL') {
          alert('Draft must be in PENDING_APPROVAL status to approve. Please submit it first.');
          return;
        }
        response = await invoiceDraftAPI.approveDraft(draftId, 'Approved');
        break;
        
      case 'reject':
        if (draft.status !== 'PENDING_APPROVAL') {
          alert('Draft must be in PENDING_APPROVAL status to reject. Please submit it first.');
          return;
        }
        response = await invoiceDraftAPI.rejectDraft(draftId, 'Needs revision');
        break;
        
      case 'delete':
        if (draft.status !== 'DRAFT') {
          alert('Only draft status items can be deleted');
          return;
        }
        response = await invoiceDraftAPI.deleteDraft(draftId);
        break;
    }
    
    if (response && response.success) {
      alert('Action completed successfully');
      loadDrafts(); // Refresh the list
    } else if (response) {
      handleApiError(response);
    }
    
  } catch (error) {
    console.error('Action failed:', error);
    alert('Network error occurred');
  }
};
```

## 🔧 TypeScript Interfaces

```typescript
// types/invoiceDraft.ts

export interface CustomField {
  name: string;
  value: string;
}

export interface CreateDraftRequest {
  storeId: string;
  notes?: string;
  dueDate?: string;
  shippingAddress?: string;
  logoUrl?: string;
  customerId?: string;
  totalAmount?: number;
  netAmount?: number;
  tax?: number;
  paymentMethod?: PaymentMethod;
  cashierName?: string;
  customFields?: CustomField[];
}

export interface UpdateDraftRequest {
  notes?: string;
  dueDate?: string;
  shippingAddress?: string;
  logoUrl?: string;
  customerId?: string;
  totalAmount?: number;
  netAmount?: number;
  tax?: number;
  paymentMethod?: PaymentMethod;
  cashierName?: string;
  customFields?: CustomField[];
}

export interface GetDraftsParams {
  page?: number;
  limit?: number;
  status?: DraftStatus;
  storeId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface Draft {
  id: string;
  draftNumber: string;
  version: number;
  status: DraftStatus;
  storeId: string;
  originalInvoiceId?: string;
  notes?: string;
  dueDate?: string;
  shippingAddress?: string;
  logoUrl?: string;
  customerId?: string;
  totalAmount?: number;
  netAmount?: number;
  tax?: number;
  paymentMethod?: PaymentMethod;
  cashierName?: string;
  submittedForApprovalAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  userId: string;
  clientId?: string;
  createdAt: string;
  updatedAt: string;
  store?: Store;
  customer?: Customer;
  user?: User;
  customFields?: CustomFieldEntity[];
}

export interface DraftsResponse {
  drafts: Draft[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApprovalResponse {
  draft: Draft;
  invoice: Invoice;
}

export interface VersionHistoryResponse {
  versions: DraftVersion[];
}

export interface DraftVersion {
  id: string;
  draftId: string;
  version: number;
  previousVersionId?: string;
  notes?: string;
  dueDate?: string;
  shippingAddress?: string;
  logoUrl?: string;
  customerId?: string;
  totalAmount?: number;
  netAmount?: number;
  tax?: number;
  paymentMethod?: PaymentMethod;
  cashierName?: string;
  customFields: CustomField[];
  createdBy: string;
  createdAt: string;
  createdByUser: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  status: number;
  timestamp: string;
}

export enum DraftStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
  CHEQUE = 'CHEQUE'
}
```

## 🔄 Workflow Implementation

### Complete Draft Workflow

```typescript
class DraftWorkflow {
  // Step 1: Create Draft
  async createDraft(storeId: string, draftData: Partial<CreateDraftRequest>) {
    const data: CreateDraftRequest = {
      storeId,
      ...draftData
    };
    
    return await invoiceDraftAPI.createDraft(data);
  }

  // Step 2: Edit Draft (can be done multiple times)
  async editDraft(draftId: string, updates: UpdateDraftRequest) {
    return await invoiceDraftAPI.updateDraft(draftId, updates);
  }

  // Step 3: Submit for Approval
  async submitForApproval(draftId: string, notes?: string) {
    return await invoiceDraftAPI.submitDraft(draftId, notes);
  }

  // Step 4a: Approve (creates invoice)
  async approveDraft(draftId: string, notes?: string) {
    return await invoiceDraftAPI.approveDraft(draftId, notes);
  }

  // Step 4b: Reject (can edit and resubmit)
  async rejectDraft(draftId: string, reason: string) {
    return await invoiceDraftAPI.rejectDraft(draftId, reason);
  }

  // Direct Finalize: Skip approval workflow and create invoice immediately
  async finalizeDraft(draftId: string, notes?: string) {
    return await invoiceDraftAPI.finalizeDraft(draftId, notes);
  }

  // Complete workflow example
  async completeDraftWorkflow(storeId: string) {
    try {
      // 1. Create draft
      const createResponse = await this.createDraft(storeId, {
        notes: 'Initial draft',
        totalAmount: 1000,
        paymentMethod: 'CASH'
      });
      
      if (!createResponse.success) {
        throw new Error('Failed to create draft');
      }
      
      const draftId = createResponse.data.id;
      
      // 2. Edit draft
      await this.editDraft(draftId, {
        totalAmount: 1200,
        notes: 'Updated draft'
      });
      
      // 3. Submit for approval
      await this.submitForApproval(draftId, 'Ready for review');
      
      // 4. Approve (this would be done by a manager)
      const approvalResponse = await this.approveDraft(draftId, 'Looks good');
      
      if (approvalResponse.success) {
        console.log('Invoice created:', approvalResponse.data.invoice.invoiceNumber);
      }
      
    } catch (error) {
      console.error('Workflow error:', error);
    }
  }
}
```

### Filter and Search Implementation

```typescript
// Advanced filtering component
const DraftFilters: React.FC = () => {
  const [filters, setFilters] = useState<GetDraftsParams>({
    page: 1,
    limit: 20
  });

  const applyFilters = () => {
    // Call API with filters
    invoiceDraftAPI.getDrafts(filters);
  };

  return (
    <div className="draft-filters">
      <input
        type="text"
        placeholder="Search by draft number or customer"
        value={filters.search || ''}
        onChange={(e) => setFilters({...filters, search: e.target.value})}
      />
      
      <select
        value={filters.status || ''}
        onChange={(e) => setFilters({...filters, status: e.target.value as DraftStatus})}
      >
        <option value="">All Status</option>
        <option value="DRAFT">Draft</option>
        <option value="PENDING_APPROVAL">Pending Approval</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
      </select>
      
      <input
        type="date"
        value={filters.dateFrom || ''}
        onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
      />
      
      <input
        type="date"
        value={filters.dateTo || ''}
        onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
      />
      
      <button onClick={applyFilters}>Apply Filters</button>
    </div>
  );
};
```

## 📊 Status Tracking

```typescript
// Status badge component
const StatusBadge: React.FC<{ status: DraftStatus }> = ({ status }) => {
  const getStatusColor = (status: DraftStatus) => {
    switch (status) {
      case 'DRAFT': return 'blue';
      case 'PENDING_APPROVAL': return 'orange';
      case 'APPROVED': return 'green';
      case 'REJECTED': return 'red';
      default: return 'gray';
    }
  };

  return (
    <span 
      className={`status-badge status-${status.toLowerCase()}`}
      style={{ 
        backgroundColor: getStatusColor(status),
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px'
      }}
    >
      {status.replace('_', ' ')}
    </span>
  );
};
```

---

## 🎯 Quick Start Checklist

### Frontend Developer Tasks:

1. **Setup API Client**
   - Copy the `InvoiceDraftAPI` class
   - Update `baseURL` with your API endpoint
   - Implement authentication headers

2. **Create TypeScript Interfaces**
   - Copy all the interfaces from the TypeScript section
   - Add them to your types folder

3. **Implement Core Components**
   - Draft creation form
   - Draft listing with filters
   - Draft detail view
   - Approval workflow buttons

4. **Add Error Handling**
   - Implement the error handling helper
   - Add loading states
   - Add success/error notifications

5. **Test Workflow**
   - Create → Edit → Submit → Approve
   - Test error scenarios
   - Test pagination and filtering

### API Testing with Postman/cURL:

```bash
# Create Draft
curl -X POST "https://your-api.com/api/v1/invoice-drafts" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "store-uuid-123",
    "notes": "Test draft",
    "totalAmount": 1000
  }'

# Get Drafts
curl -X GET "https://your-api.com/api/v1/invoice-drafts?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Submit for Approval
curl -X POST "https://your-api.com/api/v1/invoice-drafts/DRAFT_ID/submit" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Ready for review"}'
```

Is integration guide complete hai! Agar koi specific part ke baare mein aur detail chahiye ya koi confusion hai to batayiye main aur explain kar dunga.
