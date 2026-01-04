import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// register required Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// interface for props
interface PatientsChartProps {
  months: string[];
  projections: { [key: string]: number | string | undefined }[];
}

// function to calculate cumulative patients for each month
const calculateCumulativePatients = (projections: PatientsChartProps['projections'], months: string[]): number[] => {
  const cumulativePatients: number[] = [];

  months.forEach((month, index) => {
    // calculate the cumulative patients up to the current month
    const cumulativeTotal = projections.reduce((total, projection) => {
      const monthlyPatients = (projection[month] as number) || 0;
      return total + monthlyPatients;
    }, 0);

    // add cumulative total to the array, adding it to the previous cumulative total
    const previousTotal = cumulativePatients[index - 1] || 0;
    cumulativePatients.push(previousTotal + cumulativeTotal);
  });

  return cumulativePatients;
};

const PatientsChart: React.FC<PatientsChartProps> = ({ months, projections }) => {
  const cumulativePatients = calculateCumulativePatients(projections, months);

  const data = {
    labels: months.map(month => month.charAt(0).toUpperCase() + month.slice(1)),
    datasets: [
      {
        label: 'Cumulative Patients',
        data: cumulativePatients,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        ticks: {
          // limit the number of values shown on the y-axis
          maxTicksLimit: 7,
        },
      },
    },
  };

  return (
    // draw graph 
    <div style={{ width: '60%', margin: 'auto', padding: '10px' }}>
      <Line data={data} options={options} />
    </div>
  );
};

export default PatientsChart;
