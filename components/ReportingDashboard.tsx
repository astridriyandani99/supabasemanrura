import React, { useMemo } from 'react';
import type { Ward, AllAssessments, Standard } from '../types';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler);

interface ReportingDashboardProps {
    wards: Ward[];
    allAssessments: AllAssessments;
    manruraData: Standard[];
}

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        <div>{children}</div>
    </div>
);

const ReportingDashboard: React.FC<ReportingDashboardProps> = ({ wards, allAssessments, manruraData }) => {
    
    const reportData = useMemo(() => {
        const pointMap = new Map(manruraData.flatMap(std => std.elements.flatMap(el => el.poin.map(p => [p.id, p.text]))));
        const standardPointMap = new Map(manruraData.map(std => [std.id, std.elements.flatMap(el => el.poin.map(p => p.id))]));
        
        let totalAssessedCount = 0;
        
        // Per-Ward Scores
        const wardScores = wards.map(ward => {
            const wardData = allAssessments[ward.id] || {};
            const scores = Object.values(wardData)
                .map(d => d.assessor_score)
                .filter((s): s is number => s !== undefined && s !== null);
            
            if (scores.length > 0) totalAssessedCount += scores.length;
            const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            return { name: ward.name, average };
        });

        // Per-Standard Scores
        const standardScores = manruraData.map(std => {
            const pointIds = standardPointMap.get(std.id) || [];
            const scores = wards.flatMap(ward => {
                const wardData = allAssessments[ward.id] || {};
                return pointIds.map(pid => wardData[pid]?.assessor_score).filter((s): s is number => s !== undefined && s !== null);
            });
            const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            return average;
        });

        // Per-Poin Scores
        const pointScores: { [key: string]: number[] } = {};
        Object.values(allAssessments).forEach(wardData => {
            Object.entries(wardData).forEach(([poinId, data]) => {
                if (data.assessor_score !== null && data.assessor_score !== undefined) {
                    if (!pointScores[poinId]) pointScores[poinId] = [];
                    pointScores[poinId].push(data.assessor_score);
                }
            });
        });

        const pointScoreAverages = Object.entries(pointScores).map(([poinId, scores]) => ({
            id: poinId,
            text: pointMap.get(poinId) || 'Poin tidak diketahui',
            average: scores.reduce((a, b) => a + b, 0) / scores.length,
        })).sort((a, b) => a.average - b.average);

        const weakestPoints = pointScoreAverages.slice(0, 5);
        const strongestPoints = [...pointScoreAverages].sort((a,b) => b.average - a.average).slice(0, 5);

        return { wardScores, standardScores, weakestPoints, strongestPoints, hasData: totalAssessedCount > 0 };

    }, [wards, allAssessments, manruraData]);
    
    if (!reportData.hasData) {
        return (
             <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 text-center">
                <h3 className="text-lg font-semibold text-slate-800">Dashboard Laporan</h3>
                <p className="mt-2 text-slate-500">Belum ada data penilaian dari asesor untuk ditampilkan. Grafik akan muncul di sini setelah penilaian divalidasi.</p>
            </div>
        )
    }

    const barChartData = {
        labels: reportData.wardScores.map(w => w.name),
        datasets: [{
            label: 'Skor Rata-rata',
            data: reportData.wardScores.map(w => w.average.toFixed(2)),
            backgroundColor: 'rgba(56, 189, 248, 0.6)',
            borderColor: 'rgba(56, 189, 248, 1)',
            borderWidth: 1,
        }],
    };
    
    const radarChartData = {
        labels: manruraData.map(s => s.shortTitle),
        datasets: [{
            label: 'Skor Rata-rata Keseluruhan',
            data: reportData.standardScores,
            backgroundColor: 'rgba(56, 189, 248, 0.2)',
            borderColor: 'rgba(56, 189, 248, 1)',
            borderWidth: 1,
        }]
    };

    const PointTable: React.FC<{title: string, data: typeof reportData.weakestPoints, color: string}> = ({title, data, color}) => (
        <ChartCard title={title}>
            <ul className="space-y-3">
                {data.map(point => (
                    <li key={point.id} className="text-sm border-l-4 pl-3" style={{ borderColor: color }}>
                        <div className="flex justify-between items-center">
                            <p className="text-slate-700 font-medium pr-2">{point.text}</p>
                            <span className="font-bold text-slate-800 flex-shrink-0">{point.average.toFixed(2)}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </ChartCard>
    );

    return (
        <div className="space-y-8">
            <ChartCard title="Perbandingan Skor Rata-rata per Ruangan">
                 <Bar options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 10 } } }} data={barChartData} />
            </ChartCard>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <ChartCard title="Performa Rata-rata per Standar">
                    <Radar options={{ responsive: true, scales: { r: { beginAtZero: true, max: 10 }}}} data={radarChartData} />
                </ChartCard>
                 <div className="space-y-8">
                    <PointTable title="5 Poin Penilaian Terkuat" data={reportData.strongestPoints} color="#22c55e" />
                    <PointTable title="5 Poin Penilaian Terlemah" data={reportData.weakestPoints} color="#ef4444" />
                </div>
            </div>
        </div>
    );
};

export default ReportingDashboard;