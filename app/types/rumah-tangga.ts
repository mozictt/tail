export enum CategoryType {
  PEMASUKAN = 'PEMASUKAN',
  PENGELUARAN = 'PENGELUARAN',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface ExpenseCategory {
  id: number;
  name: string;
  icon?: string;
  type: CategoryType;
  color?: string;
  orderNo?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryPayload {
  name: string;
  icon?: string;
  type: CategoryType;
  color?: string;
  orderNo?: number;
}

export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> {
  isActive?: boolean;
}

export interface FamilyMember {
  id: number;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateFamilyMemberPayload {
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
}

export interface Transaction {
  id: number;
  description: string;
  title?: string; // fallback
  amount: number;
  type: TransactionType;
  transactionDate: string;
  receiptPhoto?: string;
  receiptPath?: string;
  notes?: string;
  isRecurring: boolean;
  categoryId: number;
  category?: ExpenseCategory;
  familyMemberId?: number;
  familyMember?: FamilyMember;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransactionFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
  categoryId?: number;
  familyMemberId?: number;
  type?: TransactionType;
  isRecurring?: boolean;
  sortBy?: string;
  sortType?: 'asc' | 'desc';
}

export interface TransactionListResponse {
  items: Transaction[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface CreateTransactionPayload {
  categoryId: number;
  familyMemberId?: number;
  description: string;
  amount: number;
  type: TransactionType;
  transactionDate: string;
  notes?: string;
  isRecurring?: boolean;
}

export interface BudgetPlan {
  id: number;
  categoryId: number;
  category?: ExpenseCategory;
  budgetAmount: number;
  usedAmount?: number;
  realizedAmount?: number;
  remainingAmount?: number;
  percentage?: number;
  periodMonth: number;
  periodYear: number;
  notes?: string;
}

export interface CreateBudgetPayload {
  categoryId: number;
  budgetAmount: number;
  periodMonth: number;
  periodYear: number;
  notes?: string;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  incomeChangePercentage: number;
  expenseChangePercentage: number;
  netBalanceChangePercentage: number;
  totalTransactionsCount: number;
}

export interface DailyChartData {
  date: string;
  income: number;
  expense: number;
}

export interface CategoryBreakdownData {
  categoryId: number;
  categoryName: string;
  color: string;
  totalAmount: number;
  percentage: number;
}

export interface MemberBreakdownData {
  memberId: number;
  memberName: string;
  totalAmount: number;
  percentage: number;
}

export interface MonthlyReportData {
  month: number;
  monthName: string;
  income: number;
  expense: number;
  net: number;
}
