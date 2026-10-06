import { useApi } from "@/composables/useApi";
import type {
  ExpenseCategory,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  FamilyMember,
  CreateFamilyMemberPayload,
  Transaction,
  CreateTransactionPayload,
  TransactionFilterQuery,
  TransactionListResponse,
  BudgetPlan,
  CreateBudgetPayload,
  DashboardSummary,
  DailyChartData,
  CategoryBreakdownData,
  MemberBreakdownData,
  MonthlyReportData,
  CategoryType,
  TransactionType,
} from "@/types/rumah-tangga";

export const RumahTanggaService = () => {
  const api = useApi();

  const handleResponse = (res: any) => {
    if (!res) throw new Error("Tidak ada respon dari server");
    return res.data !== undefined ? res.data : res;
  };

  // ---------------------------------------------------------------------------
  // KATEGORI API
  // ---------------------------------------------------------------------------
  const getCategories = async (type?: CategoryType): Promise<ExpenseCategory[]> => {
    try {
      const params = type ? { type } : {};
      const res = await api("/rumah-tangga/categories", { params });
      return handleResponse(res);
    } catch (err) {
      console.error("getCategories error:", err);
      throw err;
    }
  };

  const getCategoriesAdmin = async (type?: CategoryType): Promise<ExpenseCategory[]> => {
    try {
      const params = type ? { type } : {};
      const res = await api("/rumah-tangga/categories/admin", { params });
      return handleResponse(res);
    } catch (err) {
      console.error("getCategoriesAdmin error:", err);
      throw err;
    }
  };

  const getCategoryById = async (id: number): Promise<ExpenseCategory> => {
    try {
      const res = await api(`/rumah-tangga/categories/${id}`);
      return handleResponse(res);
    } catch (err) {
      console.error("getCategoryById error:", err);
      throw err;
    }
  };

  const createCategory = async (payload: CreateCategoryPayload): Promise<ExpenseCategory> => {
    try {
      const res = await api("/rumah-tangga/categories", {
        method: "POST",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("createCategory error:", err);
      throw err;
    }
  };

  const updateCategory = async (
    id: number,
    payload: UpdateCategoryPayload
  ): Promise<ExpenseCategory> => {
    try {
      const res = await api(`/rumah-tangga/categories/${id}`, {
        method: "PATCH",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("updateCategory error:", err);
      throw err;
    }
  };

  const deleteCategory = async (id: number): Promise<void> => {
    try {
      await api(`/rumah-tangga/categories/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("deleteCategory error:", err);
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // ANGGOTA KELUARGA API
  // ---------------------------------------------------------------------------
  const getFamilyMembers = async (): Promise<FamilyMember[]> => {
    try {
      const res = await api("/rumah-tangga/family-members");
      return handleResponse(res);
    } catch (err) {
      console.error("getFamilyMembers error:", err);
      throw err;
    }
  };

  const createFamilyMember = async (payload: CreateFamilyMemberPayload): Promise<FamilyMember> => {
    try {
      const res = await api("/rumah-tangga/family-members", {
        method: "POST",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("createFamilyMember error:", err);
      throw err;
    }
  };

  const updateFamilyMember = async (
    id: number,
    payload: Partial<CreateFamilyMemberPayload> & { isActive?: boolean }
  ): Promise<FamilyMember> => {
    try {
      const res = await api(`/rumah-tangga/family-members/${id}`, {
        method: "PATCH",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("updateFamilyMember error:", err);
      throw err;
    }
  };

  const deleteFamilyMember = async (id: number): Promise<void> => {
    try {
      await api(`/rumah-tangga/family-members/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("deleteFamilyMember error:", err);
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // TRANSAKSI API
  // ---------------------------------------------------------------------------
  const getTransactions = async (
    query: TransactionFilterQuery
  ): Promise<TransactionListResponse> => {
    try {
      const res = await api("/rumah-tangga/transactions", { params: query });
      const data = handleResponse(res);
      if (data && data.items) {
        return data;
      }
      return {
        items: Array.isArray(data) ? data : [],
        meta: {
          totalItems: Array.isArray(data) ? data.length : 0,
          itemCount: Array.isArray(data) ? data.length : 0,
          itemsPerPage: query.limit || 10,
          totalPages: 1,
          currentPage: query.page || 1,
        },
      };
    } catch (err) {
      console.error("getTransactions error:", err);
      throw err;
    }
  };

  const getTransactionById = async (id: number): Promise<Transaction> => {
    try {
      const res = await api(`/rumah-tangga/transactions/${id}`);
      return handleResponse(res);
    } catch (err) {
      console.error("getTransactionById error:", err);
      throw err;
    }
  };

  const createTransaction = async (payload: CreateTransactionPayload): Promise<Transaction> => {
    try {
      const res = await api("/rumah-tangga/transactions", {
        method: "POST",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("createTransaction error:", err);
      throw err;
    }
  };

  const updateTransaction = async (
    id: number,
    payload: Partial<CreateTransactionPayload>
  ): Promise<Transaction> => {
    try {
      const res = await api(`/rumah-tangga/transactions/${id}`, {
        method: "PATCH",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("updateTransaction error:", err);
      throw err;
    }
  };

  const deleteTransaction = async (id: number): Promise<void> => {
    try {
      await api(`/rumah-tangga/transactions/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("deleteTransaction error:", err);
      throw err;
    }
  };

  const uploadReceipt = async (id: number, file: File): Promise<Transaction> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api(`/rumah-tangga/transactions/${id}/receipt`, {
        method: "POST",
        body: formData,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("uploadReceipt error:", err);
      throw err;
    }
  };

  const generateIncomeFromPrevious = async (
    targetYear: number,
    targetMonth: number,
  ): Promise<{ message: string; generated: number; skipped: number; sourceMonth: number; sourceYear: number }> => {
    try {
      const res = await api("/rumah-tangga/transactions/generate-income", {
        method: "POST",
        body: { targetYear, targetMonth },
      });
      return handleResponse(res);
    } catch (err) {
      console.error("generateIncomeFromPrevious error:", err);
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // ANGGARAN (BUDGET) API
  // ---------------------------------------------------------------------------
  const getBudgets = async (year?: number, month?: number): Promise<BudgetPlan[]> => {
    try {
      const params: any = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const res = await api("/rumah-tangga/budgets", { params });
      return handleResponse(res);
    } catch (err) {
      console.error("getBudgets error:", err);
      throw err;
    }
  };

  const upsertBudget = async (payload: CreateBudgetPayload): Promise<BudgetPlan> => {
    try {
      const res = await api("/rumah-tangga/budgets", {
        method: "POST",
        body: payload,
      });
      return handleResponse(res);
    } catch (err) {
      console.error("upsertBudget error:", err);
      throw err;
    }
  };

  const deleteBudget = async (id: number): Promise<void> => {
    try {
      await api(`/rumah-tangga/budgets/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("deleteBudget error:", err);
      throw err;
    }
  };

  const generateBudgetFromPrevious = async (
    targetYear: number,
    targetMonth: number,
    overwrite = false,
  ): Promise<{ message: string; generated: number; skipped: number; sourceMonth: number; sourceYear: number }> => {
    try {
      const res = await api("/rumah-tangga/budgets/generate", {
        method: "POST",
        body: { targetYear, targetMonth, overwrite },
      });
      return handleResponse(res);
    } catch (err) {
      console.error("generateBudgetFromPrevious error:", err);
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // DASHBOARD & GRAPH API
  // ---------------------------------------------------------------------------
  const getDashboardSummary = async (year?: number, month?: number): Promise<DashboardSummary> => {
    try {
      const params: any = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const res = await api("/rumah-tangga/dashboard/summary", { params });
      return handleResponse(res);
    } catch (err) {
      console.error("getDashboardSummary error:", err);
      throw err;
    }
  };

  const getDailyChart = async (year?: number, month?: number): Promise<DailyChartData[]> => {
    try {
      const params: any = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const res = await api("/rumah-tangga/dashboard/daily-chart", { params });
      return handleResponse(res);
    } catch (err) {
      console.error("getDailyChart error:", err);
      throw err;
    }
  };

  const getCategoryBreakdown = async (year?: number, month?: number): Promise<CategoryBreakdownData[]> => {
    try {
      const params: any = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const res = await api("/rumah-tangga/dashboard/category-breakdown", { params });
      return handleResponse(res);
    } catch (err) {
      console.error("getCategoryBreakdown error:", err);
      throw err;
    }
  };

  const getMemberBreakdown = async (year?: number, month?: number): Promise<MemberBreakdownData[]> => {
    try {
      const params: any = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const res = await api("/rumah-tangga/dashboard/member-breakdown", { params });
      return handleResponse(res);
    } catch (err) {
      console.error("getMemberBreakdown error:", err);
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // LAPORAN AKUNTANSI API
  // ---------------------------------------------------------------------------
  const getMonthlyReport = async (year?: number): Promise<MonthlyReportData[]> => {
    try {
      const params: any = {};
      if (year) params.year = year;
      const res = await api("/rumah-tangga/reports/monthly", { params });
      return handleResponse(res);
    } catch (err) {
      console.error("getMonthlyReport error:", err);
      throw err;
    }
  };

  const getTrendReport = async (months = 6): Promise<any[]> => {
    try {
      const res = await api("/rumah-tangga/reports/trend", { params: { months } });
      return handleResponse(res);
    } catch (err) {
      console.error("getTrendReport error:", err);
      throw err;
    }
  };

  const getCategoryReport = async (year?: number, month?: number): Promise<any[]> => {
    try {
      const params: any = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const res = await api("/rumah-tangga/reports/by-category", { params });
      return handleResponse(res);
    } catch (err) {
      console.error("getCategoryReport error:", err);
      throw err;
    }
  };

  const getRecurringReport = async (year?: number, month?: number): Promise<any[]> => {
    try {
      const params: any = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const res = await api("/rumah-tangga/reports/recurring", { params });
      return handleResponse(res);
    } catch (err) {
      console.error("getRecurringReport error:", err);
      throw err;
    }
  };

  return {
    getCategories,
    getCategoriesAdmin,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    getFamilyMembers,
    createFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    getTransactions,
    getTransactionById,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    uploadReceipt,
    generateIncomeFromPrevious,
    getBudgets,
    upsertBudget,
    deleteBudget,
    generateBudgetFromPrevious,
    getDashboardSummary,
    getDailyChart,
    getCategoryBreakdown,
    getMemberBreakdown,
    getMonthlyReport,
    getTrendReport,
    getCategoryReport,
    getRecurringReport,
  };
};
