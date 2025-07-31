{
  "version": 2,
  "builds": [
    {
      "src": "functions/generateBilling.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/generateBilling",
      "dest": "functions/generateBilling.ts"
    }
  ]
}
