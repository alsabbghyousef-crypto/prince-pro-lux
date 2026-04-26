import SearchableSelect from '../components/ui/SearchableSelect';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';

import api from '../services/api';

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().substring(0,10));

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data;
    }
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ['attendances', date],
    queryFn: async () => {
      const res = await api.get(`/attendances?date=${date}`);
      return res.data;
    }
  });

  const recordMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/attendances', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', date] });
      alert('تم تسجيل الحضور/الانصراف');
    }
  });

  const handleRecord = (empId: number, field: 'check_in' | 'check_out', value: string, currentAtt: any) => {
    const data = {
      employee_id: empId,
      date: date,
      check_in: field === 'check_in' ? value : (currentAtt?.check_in ? currentAtt.check_in.substring(11, 16) : null),
      check_out: field === 'check_out' ? value : (currentAtt?.check_out ? currentAtt.check_out.substring(11, 16) : null),
      status: currentAtt?.status || 'PRESENT'
    };
    recordMutation.mutate(data);
  };

  const handleStatusChange = (empId: number, status: string, currentAtt: any) => {
    const data = {
      employee_id: empId,
      date: date,
      check_in: currentAtt?.check_in ? currentAtt.check_in.substring(11, 16) : null,
      check_out: currentAtt?.check_out ? currentAtt.check_out.substring(11, 16) : null,
      status: status
    };
    recordMutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">سجل الحضور اليومي</h1>
          <p className="text-muted-foreground mt-1 text-sm">متابعة دقيقة لأوقات الدوام والتأخير</p>
        </div>
        <div className="flex items-center gap-2 bg-secondary p-2 rounded-xl">
          <CalendarIcon className="w-5 h-5 text-muted-foreground" />
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4">الموظف</th>
                <th className="px-6 py-4 text-center">الدوام الرسمي</th>
                <th className="px-6 py-4 text-center">حضور (Check-in)</th>
                <th className="px-6 py-4 text-center">انصراف (Check-out)</th>
                <th className="px-6 py-4 text-center">التأخير/التبكير</th>
                <th className="px-6 py-4 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((emp: any) => {
                const att = attendances.find((a: any) => a.employee_id === emp.id);
                
                return (
                  <tr key={emp.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-bold">
                      {emp.name}
                      <div className="text-xs text-muted-foreground font-normal mt-1">{emp.role}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-muted-foreground">
                      {emp.shift_start ? emp.shift_start.substring(0,5) : '-'} / {emp.shift_end ? emp.shift_end.substring(0,5) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="time" 
                        value={att?.check_in ? att.check_in.substring(11, 16) : ''}
                        onChange={(e) => handleRecord(emp.id, 'check_in', e.target.value, att)}
                        className="p-1 border border-border rounded text-center w-24 bg-background"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="time" 
                        value={att?.check_out ? att.check_out.substring(11, 16) : ''}
                        onChange={(e) => handleRecord(emp.id, 'check_out', e.target.value, att)}
                        className="p-1 border border-border rounded text-center w-24 bg-background"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col gap-1 items-center justify-center">
                        {att?.lateness_minutes > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" /> تأخير {att.lateness_minutes} د
                          </span>
                        ) : <span className="text-muted-foreground text-xs">-</span>}
                        
                        {att?.early_departure_minutes > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded mt-1">
                            تبكير {att.early_departure_minutes} د
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center flex justify-center">
                      <SearchableSelect
                        options={[
                          { label: 'حاضر', value: 'PRESENT' },
                          { label: 'غائب', value: 'ABSENT' },
                          { label: 'متأخر', value: 'LATE' },
                          { label: 'نصف يوم', value: 'HALF_DAY' }
                        ]}
                        value={att?.status || 'PRESENT'}
                        onChange={(v) => handleStatusChange(emp.id, String(v), att)}
                        className="w-32"
                        buttonClassName={`text-xs font-bold px-2 py-1.5 rounded-lg border-0 cursor-pointer ${
                          att?.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 
                          att?.status === 'LATE' ? 'bg-orange-100 text-orange-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
