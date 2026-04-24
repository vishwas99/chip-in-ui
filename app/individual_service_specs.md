# Individual Expenses Service Specifications

## Base URL
Values from env: `API_BASE_URL` (e.g., `https://api.chipin.com`)

## 1. Get Individual Expenses (Friends)
**Endpoint**: `GET /friends/advances` 
**Query Parameters**:
- `userId`: string (UUID)

**Response**: `200 OK`
```json
[
  {
    "id": "user-uuid-2",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "avatarUrl": "https://example.com/avatar2.png",
    "balance": {
        "amount": 45.00,
        "currency": "USD",
        "status": "OWED" // User is owed 45 by Alice
    }
  },
  {
    "id": "user-uuid-3",
    "name": "Bob Jones",
    "email": "bob@example.com",
    "avatarUrl": null,
    "balance": {
        "amount": 20.00,
        "currency": "USD",
        "status": "OWES" // User owes 20 to Bob
    }
  }
]
```

## 2. Get Friend Details
**Endpoint**: `GET /friends/{friendId}`

## 3. Add Friend / Expense
**Endpoint**: `POST /friends/expense`
