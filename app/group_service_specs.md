# Group Service Specifications

## Base URL
Values from env: `API_BASE_URL` (e.g., `https://api.chipin.com`)

## 1. Get User's Groups
**Endpoint**: `GET /groups/user` (or `${GROUP_FOR_USER_CONTEXT}` relative to base)
**Query Parameters**:
- `userId`: string (UUID)

**Response**: `200 OK`
```json
[
  {
    "id": "group-uuid-1",
    "name": "Trip to Vegas",
    "description": "Weekend getaway",
    "avatarUrl": "https://example.com/avatar1.png", 
    "memberCount": 5,
    "createdAt": "2023-10-01T10:00:00Z",
    "userBalance": {
        "amount": 150.00,
        "currency": "USD",
        "status": "OWED" // or "OWES"
    }
  },
  {
    "id": "group-uuid-2",
    "name": "House Rent",
    "description": "Monthly expenses",
    "avatarUrl": null,
    "memberCount": 3,
    "createdAt": "2023-09-15T09:00:00Z",
    "userBalance": {
        "amount": 50.00,
        "currency": "USD",
        "status": "OWES"
    }
  }
]
```

## 2. Get Group Details
**Endpoint**: `GET /groups/{groupId}`

## 3. Create Group
**Endpoint**: `POST /groups`
**Payload**:
```json
{
  "name": "Dinner Party",
  "description": "Birthday celebration",
  "members": ["user-uuid-1", "user-uuid-2"],
  "createdBy": "user-uuid-current"
}
```
