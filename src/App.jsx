import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Filter, ChevronDown, Trash2, CheckCircle, ArrowRight, Edit, Download } from 'lucide-react'; // Added Edit and Download icons

// Helper function to format date to YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get the start of the current week (Sunday)
const getStartOfWeek = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Go back to Sunday
  return formatDate(d);
};

// Helper function to get the start of the current month
const getStartOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1); // Set to the 1st of the month
  return formatDate(d);
};


// Main App Component
const App = () => {
  // --- Onboarding State ---
  // Tracks the current step of onboarding. If null, onboarding is complete.
  const [onboardingStep, setOnboardingStep] = useState(
    localStorage.getItem('quickbill_onboarding_complete') ? null : 1
  );

  // --- Expense Tracking States ---
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food'); // Default category
  const [editingExpenseId, setEditingExpenseId] = useState(null); // Tracks which expense is being edited

  // Filtering states
  const [filterCategory, setFilterCategory] = useState('All');
  const [timePeriodFilter, setTimePeriodFilter] = useState('Today'); // 'Today', 'Week', 'Month', 'All Time'

  // Display totals
  const [currentPeriodTotal, setCurrentPeriodTotal] = useState(0);

  const categoryOptions = ['Food', 'Transport', 'Bills', 'Misc', 'Entertainment', 'Shopping'];

  // Refs for filter dropdowns to handle clicks outside
  const categoryFilterRef = useRef(null);
  const timePeriodFilterRef = useRef(null);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [isTimePeriodFilterOpen, setIsTimePeriodFilterOpen] = useState(false);


  // --- Effects for LocalStorage and Calculations ---

  // Load expenses from localStorage on initial mount
  useEffect(() => {
    try {
      const storedExpenses = JSON.parse(localStorage.getItem('quickbill_expenses')) || [];
      setExpenses(storedExpenses);
    } catch (e) {
      console.error("Failed to load expenses from localStorage:", e);
      setExpenses([]); // Reset if corrupted
    }
  }, []);

  // Save expenses to localStorage whenever 'expenses' state changes
  useEffect(() => {
    localStorage.setItem('quickbill_expenses', JSON.stringify(expenses));
    calculateCurrentPeriodSpending(expenses, timePeriodFilter);
  }, [expenses, timePeriodFilter]); // Recalculate if expenses or timePeriodFilter changes

  // Recalculate current period spending when timePeriodFilter changes
  useEffect(() => {
    calculateCurrentPeriodSpending(expenses, timePeriodFilter);
  }, [timePeriodFilter, expenses]); // Depend on expenses too for initial load

  // Calculate spending for the selected period
  const calculateCurrentPeriodSpending = (currentExpenses, period) => {
    let startDate;
    const today = formatDate(new Date());

    if (period === 'Today') {
      startDate = today;
    } else if (period === 'Week') {
      startDate = getStartOfWeek(new Date());
    } else if (period === 'Month') {
      startDate = getStartOfMonth(new Date());
    }

    const total = currentExpenses
      .filter(exp => {
        if (period === 'All Time') return true;
        if (period === 'Today') return exp.date === today;
        return exp.date >= startDate;
      })
      .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    setCurrentPeriodTotal(total);
  };


  // --- Onboarding Handlers ---
  const handleNextOnboarding = () => {
    if (onboardingStep < 3) {
      setOnboardingStep(prev => prev + 1);
    } else {
      handleCompleteOnboarding();
    }
  };

  const handleCompleteOnboarding = () => {
    localStorage.setItem('quickbill_onboarding_complete', 'true');
    setOnboardingStep(null); // Hide onboarding
  };

  const handleSkipOnboarding = () => {
    handleCompleteOnboarding();
  };

  // --- Expense Tracking Handlers ---

  const handleAddOrUpdateExpense = (e) => {
    e.preventDefault();
    if (!title || !amount || isNaN(parseFloat(amount))) {
      alert('Please enter a valid title and amount.');
      return;
    }

    if (editingExpenseId) {
      // Update existing expense
      setExpenses(prevExpenses => prevExpenses.map(exp =>
        exp.id === editingExpenseId
          ? { ...exp, title, amount: parseFloat(amount).toFixed(2), category }
          : exp
      ));
      setEditingExpenseId(null); // Exit editing mode
    } else {
      // Add new expense
      const newExpense = {
        id: Date.now(),
        title,
        amount: parseFloat(amount).toFixed(2),
        category,
        date: formatDate(new Date()),
      };
      setExpenses(prevExpenses => [newExpense, ...prevExpenses]); // Add to top
    }

    // Reset form fields
    setTitle('');
    setAmount('');
    setCategory('Food');
  };

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setTitle(expense.title);
    setAmount(expense.amount);
    setCategory(expense.category);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top to show form
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      setExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== id));
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear ALL your QuickBill data? This cannot be undone.')) {
      localStorage.removeItem('quickbill_expenses');
      setExpenses([]);
      setCurrentPeriodTotal(0);
      setFilterCategory('All');
      setTimePeriodFilter('Today');
      alert('All data cleared!');
    }
  };

  const handleFilterCategoryChange = (cat) => {
    setFilterCategory(cat);
    setIsCategoryFilterOpen(false);
  };

  const handleTimePeriodFilterChange = (period) => {
    setTimePeriodFilter(period);
    setIsTimePeriodFilterOpen(false);
  };

  // Filtered expenses for display based on category and time period
  const getFilteredExpenses = () => {
    let filtered = expenses;

    // Apply category filter
    if (filterCategory !== 'All') {
      filtered = filtered.filter(exp => exp.category === filterCategory);
    }

    // Apply time period filter
    const today = formatDate(new Date());
    if (timePeriodFilter === 'Today') {
      filtered = filtered.filter(exp => exp.date === today);
    } else if (timePeriodFilter === 'Week') {
      const startOfWeek = getStartOfWeek(new Date());
      filtered = filtered.filter(exp => exp.date >= startOfWeek);
    } else if (timePeriodFilter === 'Month') {
      const startOfMonth = getStartOfMonth(new Date());
      filtered = filtered.filter(exp => exp.date >= startOfMonth);
    }
    // 'All Time' needs no further date filtering

    return filtered;
  };

  const displayedExpenses = getFilteredExpenses();

  const handleExportCSV = () => {
    if (displayedExpenses.length === 0) {
      alert("No expenses to export!");
      return;
    }

    const headers = ["Title", "Amount", "Category", "Date"];
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const expense of displayedExpenses) {
      const row = [
        `"${expense.title.replace(/"/g, '""')}"`, // Escape double quotes
        expense.amount,
        expense.category,
        expense.date,
      ];
      csvRows.push(row.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `QuickBill_Expenses_${formatDate(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert("Expenses exported successfully!");
  };


  // Handle clicks outside the filter dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(event.target)) {
        setIsCategoryFilterOpen(false);
      }
      if (timePeriodFilterRef.current && !timePeriodFilterRef.current.contains(event.target)) {
        setIsTimePeriodFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Render Onboarding or Main App ---
  if (onboardingStep !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-lg w-full text-center space-y-6 border border-gray-700">
          {onboardingStep === 1 && (
            <>
              <h2 className="text-3xl font-bold text-blue-400">Welcome to QuickBill!</h2>
              <p className="text-lg text-gray-300">
                Track your daily expenses effortlessly.
              </p>
              <p className="text-sm text-gray-400">
                Let's get you set up in 3 quick steps.
              </p>
            </>
          )}
          {onboardingStep === 2 && (
            <>
              <h2 className="text-3xl font-bold text-green-400">Log Your Spending</h2>
              <p className="text-lg text-gray-300">
                Simply add a title, amount, and category for each expense.
              </p>
              <p className="text-sm text-gray-400">
                We'll automatically add the date for you.
              </p>
            </>
          )}
          {onboardingStep === 3 && (
            <>
              <h2 className="text-3xl font-bold text-purple-400">Stay Organized</h2>
              <p className="text-lg text-gray-300">
                View recent expenses, filter by category and time, and manage your spending.
              </p>
              <p className="text-sm text-gray-400">
                All your data stays safe on your device.
              </p>
            </>
          )}

          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={handleSkipOnboarding}
              className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all duration-200 shadow-md"
            >
              Skip
            </button>
            <button
              onClick={handleNextOnboarding}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg flex items-center gap-2"
            >
              {onboardingStep < 3 ? 'Next Step' : 'Start QuickBill'}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main QuickBill App Render ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 sm:p-6 md:p-8 font-inter">
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header and Daily/Period Total */}
        <header className="flex flex-col sm:flex-row items-center justify-between bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h1 className="text-4xl font-extrabold text-blue-400 mb-2 sm:mb-0">QuickBill</h1>
          <div className="text-right">
            <p className="text-gray-400 text-lg">
              {timePeriodFilter === 'All Time' ? 'Total Spending' : `${timePeriodFilter}'s Spending`}
            </p>
            <p className="text-5xl font-bold text-green-400">₦{currentPeriodTotal.toFixed(2)}</p>
            <div className="relative mt-2" ref={timePeriodFilterRef}>
              <button
                onClick={() => setIsTimePeriodFilterOpen(!isTimePeriodFilterOpen)}
                className="bg-gray-700 text-gray-300 py-1 px-3 rounded-lg text-sm flex items-center justify-between hover:bg-gray-600 transition-all duration-200"
              >
                {timePeriodFilter}
                <ChevronDown size={16} className="ml-1" />
              </button>
              {isTimePeriodFilterOpen && (
                <div className="absolute z-10 right-0 mt-2 w-36 bg-gray-700 rounded-lg shadow-xl border border-gray-600 py-1">
                  {['Today', 'Week', 'Month', 'All Time'].map(period => (
                    <button
                      key={period}
                      onClick={() => handleTimePeriodFilterChange(period)}
                      className="block w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-600 text-sm"
                    >
                      {period}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Expense Input Form */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-200 mb-4">
            {editingExpenseId ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <form onSubmit={handleAddOrUpdateExpense} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Expense Title (e.g., Coffee, Groceries)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-1 sm:col-span-2 p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              placeholder="Amount (e.g., 500.00)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.01"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="p-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              type="submit"
              className={`col-span-1 sm:col-span-2 py-3 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2
                ${editingExpenseId ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-all duration-200`}
            >
              {editingExpenseId ? <Edit size={20} /> : <Plus size={20} />}
              {editingExpenseId ? 'Update Expense' : 'Add Expense'}
            </button>
          </form>
        </div>

        {/* Filters and Clear Data */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-auto" ref={categoryFilterRef}>
            <button
              onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
              className="w-full sm:w-48 bg-gray-700 text-gray-200 py-2 px-4 rounded-lg flex items-center justify-between hover:bg-gray-600 transition-all duration-200 shadow-sm border border-gray-600"
            >
              <Filter size={18} className="mr-2" />
              Filter by: {filterCategory}
              <ChevronDown size={18} className="ml-2" />
            </button>
            {isCategoryFilterOpen && (
              <div className="absolute z-10 mt-2 w-full sm:w-48 bg-gray-700 rounded-lg shadow-xl border border-gray-600 py-1">
                <button
                  onClick={() => handleFilterCategoryChange('All')}
                  className="block w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-600"
                >
                  All
                </button>
                {categoryOptions.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleFilterCategoryChange(cat)}
                    className="block w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-600"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={handleExportCSV}
              className="w-full sm:w-auto bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 shadow-md flex items-center justify-center gap-2"
            >
              <Download size={18} /> Export CSV
            </button>
            <button
              onClick={handleClearAllData}
              className="w-full sm:w-auto bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-all duration-200 shadow-md flex items-center justify-center gap-2"
            >
              <Trash2 size={18} /> Clear All Data
            </button>
          </div>
        </div>

        {/* Recent Expenses Table */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-200 mb-4">Recent Expenses</h2>
          {displayedExpenses.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No expenses found. Start adding some!</p>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {displayedExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-700 transition-colors duration-150">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-200">{expense.title}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-green-300 font-medium">₦{expense.amount}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-300">{expense.category}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-sm">{expense.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                        <div className="flex space-x-2">
                          <button onClick={() => handleEditExpense(expense)} className="text-blue-400 hover:text-blue-300">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-400 hover:text-red-300">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
