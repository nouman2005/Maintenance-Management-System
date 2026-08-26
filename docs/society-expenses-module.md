# Society Expenses and Finance Module

## Architecture

The finance module adds a central ledger model on top of the existing society, admin, maintenance, flats, and tenants modules.

Core rule:

`Opening Balance + Total Income - Paid Expenses = Closing Balance`

For each payment account:

`Opening Account Balance + Credits - Debits = Current Account Balance`

The backend is the authoritative source for all balances. Frontend pages display values returned from finance APIs.

## Database Tables

The migration file is `database/society_expenses_module.sql`.

Created tables:

- `expense_categories`: society-wise expense categories with active/inactive status.
- `vendors`: vendors and payees that can be linked to expenses.
- `payment_accounts`: cash and bank accounts with opening balances.
- `expenses`: expense header/details, invoice fields, payment mode, status, and cancellation fields.
- `financial_transactions`: centralized ledger for opening rows, maintenance income, expenses, adjustments, and reversals.
- `expense_audit_logs`: create/update/status/cancel history.

Existing tables modified:

- No destructive table changes are required.
- Existing `maintenance_payments` are integrated through finance ledger rows using `source_type = 'maintenance_payment'`.

Seed records:

- Default expense categories are inserted for each society that has an admin.
- `Society Cash` and `Primary Bank Account` payment accounts are inserted for each society.
- Existing maintenance payments are backfilled as income credits exactly once.

## Financial Logic

Income:

- Maintenance payments create a `financial_transactions` row with `transaction_type = 'income'`, `credit_amount = payment amount`, and `source_type = 'maintenance_payment'`.
- The unique source constraint prevents the same maintenance payment from creating multiple credits.

Expense:

- Draft, pending, and approved expenses do not affect balances.
- Paid expenses create one ledger debit with `transaction_type = 'expense'`, `source_type = 'expense'`, and `debit_amount = expense amount`.
- The unique source constraint prevents double debits for repeated "mark paid" actions.

Cancellation:

- Cancelling an unpaid expense only changes its status.
- Cancelling a paid expense creates a reversal credit with `transaction_type = 'reversal'` and links it to the original transaction.
- Historical debit rows are preserved.

Balances:

- Account balance is calculated from `payment_accounts.opening_balance + SUM(credits) - SUM(debits)`.
- Society balance is the sum of account balances.
- Monthly and yearly summaries are derived from posted ledger transactions.

Money:

- SQL uses `DECIMAL(12,2)` for financial amounts.
- Backend writes normalized two-decimal strings for ledger amounts.

## API Endpoints

Mounted under `/api/v1/finance`:

- `GET /dashboard`
- `GET /ledger`
- `GET /summary`
- `GET /monthly-summary`
- `GET /yearly-summary`
- `GET /category-summary`
- `GET /payment-mode-summary`
- `GET /account-summary`
- `GET /expenses`
- `GET /expenses/:id`
- `POST /expenses`
- `PUT /expenses/:id`
- `PATCH /expenses/:id/status`
- `POST /expenses/:id/cancel`
- `GET /expense-categories`
- `POST /expense-categories`
- `PUT /expense-categories/:id`
- `PATCH /expense-categories/:id/status`
- `GET /vendors`
- `POST /vendors`
- `PUT /vendors/:id`
- `PATCH /vendors/:id/status`
- `GET /payment-accounts`
- `POST /payment-accounts`
- `PUT /payment-accounts/:id`
- `PATCH /payment-accounts/:id/status`

## Frontend Pages

The admin dashboard includes a new `Society Finance` module.

Tabs:

- Dashboard: opening balance, income, expenses, closing balance, cash/bank balance, category breakdown, payment mode breakdown, recent expenses.
- Add Expense: expense details, payment details, conditional cheque/reference fields.
- Expense List: filters by status/payment mode, search, mark paid, cancel.
- Setup: categories, vendors, payment accounts.
- Ledger: chronological financial transactions with running balance.

## Dropdowns

The app now includes a reusable `Dropdown` component at `Frontend/src/Components/ui/Dropdown.jsx`.

It supports:

- Custom arrow icon
- Open/close behavior
- Outside click close
- Keyboard navigation
- Search for longer lists
- Selected and hover states
- Loading, disabled, empty, and error states

Native frontend `<select>` usage has been replaced with this component.

## Migration Instructions

1. Review `database/society_expenses_module.sql`.
2. Execute it once against the existing MySQL database.
3. Restart the backend.
4. Open the admin dashboard and go to `Finance > Expenses & Ledger`.
5. Create or adjust real payment accounts before recording paid expenses.

## Testing Scenarios

Recommended checks:

- Opening `100000`, income `50000`, paid expense `10000` gives closing `140000`.
- Cash opening `20000`, cash income `5000`, cash expense `3000` gives `22000`.
- Pending expense does not reduce balance.
- Paid expense reduces only its selected account.
- Cancelling paid expense creates a reversal and net impact becomes zero.
- Marking paid twice does not create duplicate debit transactions.
- Existing maintenance payments appear as finance income after migration backfill.
- New maintenance payments create finance income once after migration.
