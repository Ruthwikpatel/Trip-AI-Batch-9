import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, DollarSign, Users, Receipt } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

export function ExpenseSplit() {
  const { id } = useParams();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [trip, setTrip] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    paid_by: '',
    split_among: [] as string[]
  });

  const [friends, setFriends] = useState(['You', 'Friend 1', 'Friend 2']);

  useEffect(() => {
    const socket = io();

    if (id) {
      socket.emit('join_trip', id);

      socket.on('expense_added', (expense) => {
        setExpenses((prev) => {
          // Check if it already exists to prevent duplicates
          if (prev.find(e => e.id === expense.id)) return prev;
          return [expense, ...prev];
        });
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripRes, expensesRes] = await Promise.all([
          axios.get(`/api/trips/${id}`),
          axios.get(`/api/trips/${id}/expenses`)
        ]);
        setTrip(tripRes.data);
        setExpenses(expensesRes.data);
        
        // Generate friend names based on people count
        const peopleCount = tripRes.data.people;
        const generatedFriends = ['You'];
        for (let i = 1; i < peopleCount; i++) {
          generatedFriends.push(`Friend ${i}`);
        }
        setFriends(generatedFriends);
        setNewExpense(prev => ({ ...prev, paid_by: 'You', split_among: generatedFriends }));
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`/api/trips/${id}/expenses`, {
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        paid_by: newExpense.paid_by,
        split_among: newExpense.split_among
      });
      setExpenses(prev => {
        if (prev.find(e => e.id === response.data.id)) return prev;
        return [response.data, ...prev];
      });
      setNewExpense({
        description: '',
        amount: '',
        paid_by: 'You',
        split_among: friends
      });
    } catch (error) {
      console.error('Failed to add expense', error);
    }
  };

  const toggleSplitPerson = (person: string) => {
    setNewExpense(prev => ({
      ...prev,
      split_among: prev.split_among.includes(person)
        ? prev.split_among.filter(p => p !== person)
        : [...prev.split_among, person]
    }));
  };

  if (isLoading) return <div className="text-center mt-20">Loading...</div>;

  // Calculate balances
  const balances: Record<string, number> = {};
  friends.forEach(f => balances[f] = 0);

  expenses.forEach(exp => {
    const amount = exp.amount;
    const splitCount = exp.split_among.length;
    if (splitCount === 0) return;
    
    const splitAmount = amount / splitCount;
    
    // Add to payer
    if (balances[exp.paid_by] !== undefined) {
      balances[exp.paid_by] += amount;
    }
    
    // Subtract from splitters
    exp.split_among.forEach((person: string) => {
      if (balances[person] !== undefined) {
        balances[person] -= splitAmount;
      }
    });
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link to={`/trip/${id}`} className="p-2 bg-white rounded-full shadow-sm hover:bg-neutral-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Expense Splitter</h1>
          <p className="text-neutral-500">Track and settle balances for {trip?.destination}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-8">
            <h2 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" /> Add Expense
            </h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                  <input
                    type="text"
                    required
                    value={newExpense.description}
                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g., Dinner at Beach"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newExpense.amount}
                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Paid By</label>
                <select
                  value={newExpense.paid_by}
                  onChange={e => setNewExpense({ ...newExpense, paid_by: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {friends.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Split Among</label>
                <div className="flex flex-wrap gap-2">
                  {friends.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleSplitPerson(f)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        newExpense.split_among.includes(f)
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-neutral-50 text-neutral-500 border border-neutral-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-neutral-900 text-white py-3 rounded-xl font-medium hover:bg-neutral-800 transition-colors mt-4"
              >
                Add Expense
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-8">
            <h2 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" /> Recent Expenses
            </h2>
            <div className="space-y-4">
              {expenses.length === 0 ? (
                <p className="text-neutral-500 text-center py-4">No expenses added yet.</p>
              ) : (
                expenses.map(exp => (
                  <div key={exp.id} className="flex justify-between items-center p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                    <div>
                      <p className="font-semibold text-neutral-900">{exp.description}</p>
                      <p className="text-sm text-neutral-500">
                        Paid by <span className="font-medium text-neutral-700">{exp.paid_by}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-emerald-600">₹{exp.amount}</p>
                      <p className="text-xs text-neutral-400">
                        Split among {exp.split_among.length}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-3xl shadow-sm p-8 text-white h-fit sticky top-24">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" /> Balances
          </h2>
          <div className="space-y-6">
            {Object.entries(balances).map(([person, balance]) => (
              <div key={person} className="flex justify-between items-center pb-4 border-b border-neutral-800 last:border-0">
                <span className="font-medium">{person}</span>
                <div className="text-right">
                  <span className={`font-bold text-lg ${balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-red-400' : 'text-neutral-400'}`}>
                    {balance > 0 ? '+' : ''}₹{Math.abs(balance).toFixed(2)}
                  </span>
                  <p className="text-xs text-neutral-500">
                    {balance > 0 ? 'Gets back' : balance < 0 ? 'Owes' : 'Settled'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
