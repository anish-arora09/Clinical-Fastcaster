import * as React from "react";
import { ReactGrid, Column, Row, CellChange, TextCell, NumberCell, CheckboxCell, DateCell } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import PatientsChart from './PatientsChart.tsx'; 
import "./App.css";

// interface for a projection, with dynamic number of months
interface Projection {
  region: string;
  enrollmentRate: number;
  sites: number;
  patients: number;
  [key: string]: number | string; // allows for more months with different names
  props?: any; // props are optional
}


// HARDCODED SEASONALITY ADJUSTMENTS (array of arrays based on country and months from Jan to Dec)
const seasonalityAdjustments: { [region: string]: number[] } = {
  Canada: [0.6, 0.8, 1, 1.2, 1.1, 1, 0.9, 0.85, 0.95, 1.05, 1.1, 0.9],
  USA: [1, 10, 1, 1.2, 1.1, 1, 0.9, 0.85, 0.95, 1.05, 1.1, 0.9],
};

// FUNCTIONS FOR GRID
// initial projections 
const getProjections = (startMonth: Date | null): Projection[] => {
  const projections: Projection[] = [
    { region: "Canada", enrollmentRate: 2, sites: 5, patients: 0 }
  ];
  
  if (!startMonth) return projections;

  // get start month index for seasonality adjustment
  const startMonthIndex = startMonth.getMonth(); // 0-based month index
  const initialMonths = getMonthsFromStart(startMonth, 1);

  projections.forEach((projection) => {
    const seasonality = seasonalityAdjustments[projection.region] || Array(12).fill(1); // seasonality for country
    initialMonths.forEach((month, idx) => {
      const monthIndex = (startMonthIndex + idx) % 12; // wrap around month index
      const adjustmentFactor = seasonality[monthIndex]; // seasonality for the current month
      projection[month] = Math.abs(projection.enrollmentRate * projection.sites * adjustmentFactor); 
    });

    // calculate the initial value for patients as the sum of all initial months with seasonality
    projection.patients = initialMonths.reduce((total, month) => total + (projection[month] as number || 0), 0);
  });

  return projections;
};

// generates columns based on the current list of months
const getColumns = (months: string[]): Column[] => {
  const baseColumns: Column[] = [
    { columnId: "region", width: 140 },
    { columnId: "enrollmentRate", width: 125 },
    { columnId: "sites", width: 80 },
    { columnId: "gap", width: 70 }, // invisible column for a gap
    { columnId: "patients", width: 130 },
  ];

  // create a column for each month
  const monthColumns: Column[] = months.map(month => ({
    columnId: month,
    width: 59,
  }));

  // combine base columns with month columns
  return [...baseColumns, ...monthColumns];
};

// generates the header row based on the current list of months
const getHeaderRow = (months: string[]): Row => {
  const baseHeaders = [
    { type: "header" as const, text: "Region / Country" },
    { type: "header" as const, text: "Enrollment Rate" },
    { type: "header" as const, text: "#Sites" },
    { type: "header" as const, text: "", className: "reactgrid-cell--gap-header" }, // empty header for gap column
    { type: "header" as const, text: "#Patients" },
  ];

  const monthHeaders = months.map(month => ({
    type: "header" as const, text: month.charAt(0).toUpperCase() + month.slice(1)
  }));

  // combine base headers with month headers
  return {
    rowId: "header",
    cells: [...baseHeaders, ...monthHeaders]
  };
};

// generates rows dynamically based on projections and months
const getRows = (projections: Projection[], months: string[]): Row[] => {
  const headerRow = getHeaderRow(months);

  return [
    headerRow,
    // create new row for each projection 
    ...projections.map<Row>((projection, idx) => ({
      rowId: idx,
      cells: [
        // region/country
        {
          type: "text",
          text: projection.region,
        },
        // enrollment rate
        {
          type: "number",
          value: Math.abs(projection.enrollmentRate),
          format: new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 1, // format to 1 d.p
            maximumFractionDigits: 1,
          }),
        },
        // sites
        {
          type: "number",
          value: Math.abs(projection.sites),
        },
        // gap column
        {
          type: "text",
          text: "",
          nonEditable: true,
          className: "reactgrid-cell--gap"
        },
        // patients
        {
          type: "number",
          value: Math.abs(projection.patients),
          format: new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 1, // format to 1 d.p
            maximumFractionDigits: 1,
          }),
          nonEditable: true,
        },
        // dynamically handle month values
        ...months.map(month => ({
          type: "number" as const,
          value: Math.abs(projection[month] as number || 0),
          nonEditable: true,
        })),
      ],
    })),
  ];
};


const monthOrder: string[] = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// HELPER FUNCTIONS
// helper function to return names of months starting from a given start month and number of months
const getMonthsFromStart = (startMonth: Date | null, numMonths: number): string[] => {
  if (!startMonth) return [];
  
  const startMonthIndex = startMonth.getMonth(); // 0-based month index
  return monthOrder.slice(startMonthIndex, startMonthIndex + numMonths);
};

// helper function to get the last month from the current list or nothing (if only 1 month)
const getLastMonth = (currentMonths: string[]): string => {
  return currentMonths[currentMonths.length - 1] || "";
};


// utility function to handle keyboard shortcuts
const keyboardShortcuts = (e: KeyboardEvent) => {
  const isMacOs = () => window.navigator.appVersion.indexOf("Mac") !== -1;

  const isWinCtrl = !isMacOs() && e.ctrlKey;
  const isMacCmd = isMacOs() && e.metaKey;

  const isZKey = e.key === 'z'; // 'z' key for undo
  const isYKey = e.key === 'y'; // 'y' key for redo

  const isWinUndo = isWinCtrl && isZKey;
  const isMacUndo = isMacCmd && isZKey && !e.shiftKey;

  const isWinRedo = isWinCtrl && isYKey;
  const isMacRedo = isMacCmd && e.shiftKey && isZKey;

  return {
    isUndo: isWinUndo || isMacUndo,
    isRedo: isWinRedo || isMacRedo
  };
};


export function App() {
  const [startMonth, setStartMonth] = React.useState<Date | null>(null);
  const [initialStartMonthIndex, setInitialStartMonthIndex] = React.useState<number | null>(null);
  const [months, setMonths] = React.useState<string[]>([]);

  const [projections, setProjections] = React.useState<Projection[]>(() => getProjections(startMonth));

  const [cellChangesIndex, setCellChangesIndex] = React.useState(() => -1);
  const [cellChanges, setCellChanges] = React.useState<CellChange<TextCell | NumberCell | CheckboxCell | DateCell>[][]>([]);

  const [targetPatients, setTargetPatients] = React.useState<number | string>("");
  const [targetMonths, setTargetMonths] = React.useState<number | string>("");

  // generate rows and columns based on the current list of months
  const rows = getRows(projections, months);
  const columns = getColumns(months);
  

  // when user enters a start month then update grid with first month immediately
  React.useEffect(() => {
    if (startMonth) {
      const monthIndex = startMonth.getMonth();
      setInitialStartMonthIndex(monthIndex);
  
      // generate the list with only the current month
      const updatedMonths = getMonthsFromStart(startMonth, 1); 
  
      setMonths(updatedMonths); // update months to only include the current month
  
      setProjections((prevProjections) => {
        return prevProjections.map(projection => {
          const seasonality = seasonalityAdjustments[projection.region] || Array(12).fill(1);
          
          // update projections with only the current month
          const currentMonth = updatedMonths[0];
          projection[currentMonth] = projection.enrollmentRate * projection.sites * seasonality[monthIndex];
          
          // recalculate patients with only the current month
          projection.patients = projection[currentMonth] as number || 0;
  
          return projection;
        });
      });
    }
  }, [startMonth]);
  

  // HANDLE CHANGES FUNCTIONS
  // applies changes to projections, either using new or previous cell values
  const applyNewValue = (
    changes: CellChange<TextCell | NumberCell | CheckboxCell | DateCell>[],
    prevProjections: Projection[],
    usePrevValue: boolean = false
  ): Projection[] => {
    const updatedProjections = [...prevProjections];
  
    changes.forEach((change) => {
      const projectionIndex = change.rowId;
      const fieldName = change.columnId;
      const cell = usePrevValue ? change.previousCell : change.newCell;
      let cellValue: string | number = "";
  
      // identify which type the cell is (number or text)
      if (cell.type === "number") {
        cellValue = cell.value || 0;
      } else if (cell.type === "text") {
        cellValue = cell.text;
      }
  
    // update projection value based on the type of cell
    if (typeof updatedProjections[projectionIndex][fieldName] === "number") {
      updatedProjections[projectionIndex][fieldName] = +cellValue; // + converts cellValue from a text to number
    } else {
      updatedProjections[projectionIndex][fieldName] = cellValue;
    }
  
  // recalculate month values based on updated enrollmentRate or sites with seasonality
  if (fieldName === "enrollmentRate" || fieldName === "sites") {
    const seasonality = seasonalityAdjustments[updatedProjections[projectionIndex].region] || Array(12).fill(1); // seasonality for the country
    months.forEach((month, idx) => {
      const monthIndex = (initialStartMonthIndex! + idx) % 12; // wrap around month index
      const adjustmentFactor = seasonality[monthIndex]; // apply seasonality for the month
      updatedProjections[projectionIndex][month] = (updatedProjections[projectionIndex].enrollmentRate as number) * (updatedProjections[projectionIndex].sites as number) * adjustmentFactor;
    });
  }
  
    // recalculate patients based on updated month values
    updatedProjections.forEach(projection => {
      projection.patients = months.reduce((total, month) => total + (projection[month] as number || 0), 0);
    });
  });
  
    return updatedProjections;
  };
  

  // updates cells when a change is made and updates projections
  const handleChanges = (changes: CellChange<TextCell | NumberCell | CheckboxCell | DateCell>[]) => {
    setCellChangesIndex((prevIndex) => {
      const newIndex = prevIndex + 1;
      const newCellChanges = [...cellChanges.slice(0, newIndex), changes];
      setCellChanges(newCellChanges);
      return newIndex;
    });
  
    setProjections((prevProjections) => applyNewValue(changes, prevProjections));
  };

  // function to handle undo operation
  const handleUndoChanges = () => {
    if (cellChangesIndex >= 0) {
      const previousIndex = cellChangesIndex - 1;
      setProjections((prevProjections) => {
        const newProjections = applyNewValue(cellChanges[cellChangesIndex], prevProjections, true);
        return newProjections;
      });
      setCellChangesIndex(previousIndex);
    }
  };
  
  // function to handle redo operation
  const handleRedoChanges = () => {
    if (cellChangesIndex + 1 < cellChanges.length) {
      const nextIndex = cellChangesIndex + 1;
      setProjections((prevProjections) => {
        const newProjections = applyNewValue(cellChanges[nextIndex], prevProjections);
        return newProjections;
      });
      setCellChangesIndex(nextIndex);
    }
  };

  // handle keyboard shortcuts for undo/redo immediately after they are pressed
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcuts = keyboardShortcuts(e);
      if (shortcuts.isUndo) {
        e.preventDefault();  // prevent default browser behavior
        handleUndoChanges();
      }
      if (shortcuts.isRedo) {
        e.preventDefault();  // prevent default browser behavior
        handleRedoChanges();
      }
    };
  
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cellChanges, cellChangesIndex]);


// MODIFY PROJECTIONS FUNCTIONS
// function to add a new month with seasonality adjustment
const addMonth = () => {
  if (initialStartMonthIndex === null) return; // ensure we have an initial start month

  const nextMonthIndex = (initialStartMonthIndex + months.length) % monthOrder.length;
  const nextMonth = monthOrder[nextMonthIndex];
  if (nextMonth) {
    // update projections with seasonality
    setProjections((prevProjections) => {
      return prevProjections.map(projection => {
        const seasonality = seasonalityAdjustments[projection.region] || Array(12).fill(1); // default seasonality is 1 for all months if not specified
        const monthAdjustment = seasonality[nextMonthIndex]; // get seasonality factor for the new month

        // calculate new month for each country with seasonality adjustment
        projection[nextMonth] = projection.enrollmentRate * projection.sites * monthAdjustment;

        // recalculate total patients for each country 
        projection.patients = [...months, nextMonth].reduce((total, month, idx) => {
          const monthIndex = (initialStartMonthIndex! + idx) % 12; // handle month index overflow beyond 12 months
          const adjustedValue = (projection[month] as number || 0) * seasonality[monthIndex]; // adjust existing months
          return total + adjustedValue;
        }, 0);

        return projection;
      });
    });
    // update months list
    setMonths(prevMonths => [...prevMonths, nextMonth]);
  }
};


  // function to remove the last month
  const removeLastMonth = () => {
    const lastMonth = getLastMonth(months);
    if (months.length > 1 && lastMonth) { // fnsure at least one month remains
      setProjections((prevProjections) => {
        return prevProjections.map(projection => {
          delete projection[lastMonth];
          
          // recalculate total patients for each country 
          projection.patients = months.slice(0, -1).reduce((total, month) => total + (projection[month] as number || 0), 0);
          
          return projection;
        });
      });
      // update months list
      setMonths(prevMonths => prevMonths.slice(0, -1));
    }
  };

  // function to add a new country
  const addCountry = () => {
    const newProjection: Projection = {
      region: "",
      enrollmentRate: 0,
      sites: 0,
      patients: 0,
      // initialize all month values to null
      ...months.reduce((acc, month) => ({ ...acc, [month]: 0 }), {}),
    };
    setProjections(prevProjections => [...prevProjections, newProjection]);
  };

  // function to remove the last country
  const removeLastCountry = () => {
    if (projections.length > 1) { // ensure at least one country remains
      setProjections(prevProjections => prevProjections.slice(0, -1));
    }
  };


  // HELPER FUNCTIONS
  // function to calculate the total number of patients
  const getTotalPatients = (): number => {
    return Number(projections.reduce((total, projection) => total + (projection.patients || 0), 0).toFixed(1));  
  };

  // function to calculate the total number of months
  const getTotalMonths = (): number => {
    return months.length;
  };

  // function to calculate the projected end month
  const getProjectedEndMonth = (): string => {
    if (!startMonth || !months.length) return "";
    
    const endMonthIndex = ((initialStartMonthIndex || 0) + months.length - 1) % monthOrder.length; 
    const endMonth = monthOrder[endMonthIndex];

    const endYear = startMonth.getFullYear() + Math.floor(((initialStartMonthIndex || 0) + months.length - 1) / 12)

    // return the end month captialised with correct year
    return `${endMonth.charAt(0).toUpperCase() + endMonth.slice(1)} ${endYear}`;
  };


  return (
    <div className="app-container">
      <h1 className="projections-heading">Projections</h1>

      <div className="target-inputs-box">
        <div className="target-inputs-row">
          <div className="target-inputs-label">Target Patients:</div>
          <input
            type="text"
            className="target-inputs-input"
            value={targetPatients}
            onChange={(e) => setTargetPatients(e.target.value)}
          />
        </div>
        <div className="target-inputs-row">
          <div className="target-inputs-label">Start Month:</div>
          <DatePicker // bring up calendar when input box is clicked
            selected={startMonth}
            onChange={(date: Date | null) => setStartMonth(date)}
            dateFormat="MM/yyyy" // only display month and year
            showMonthYearPicker
            showFullMonthYearPicker
            className="target-inputs-input"
          />
        </div>
        <div className="target-inputs-row">
          <div className="target-inputs-label">Target Months:</div>
          <input
            type="text"
            className="target-inputs-input"
            value={targetMonths}
            onChange={(e) => setTargetMonths(e.target.value)}
          />
        </div>
      </div>

      <div className="totals-box">
        <div className="totals-row">
          <div className="totals-label">Projected Total Patients:</div>
          <div className="totals-value">{getTotalPatients()}</div>
        </div>
        <div className="totals-row">
        <div className="totals-label">Projected End Month:</div>
        <div className="totals-value">{getProjectedEndMonth()}</div>
      </div>
        <div className="totals-row">
          <div className="totals-label">Projected Number of Months:</div>
          <div className="totals-value">{getTotalMonths()}</div>
        </div>
      </div>

      <div className="table">
        <ReactGrid
          columns={columns}
          rows={rows}
          onCellsChanged={(cellChanges: CellChange[]) => {
            // casting cellChanges to match the expected type
            handleChanges(cellChanges as CellChange<TextCell | NumberCell | CheckboxCell | DateCell>[]);
          }}      
        />
      </div>

      <div className="graph-container">
        <PatientsChart months={months} projections={projections} />
      </div>

      <div className="modify-projections">
        <h2>Modify Projections</h2>
        <button onClick={addCountry}>Add country</button>
        <button onClick={removeLastCountry} disabled={projections.length <= 1}>Remove country</button> {/* disable button when there is only one country left */}
        <button onClick={addMonth} disabled={!startMonth}>Add month</button> {/* disable button when no start month is selected */}
        <button onClick={removeLastMonth} disabled={months.length <= 1}>Remove month</button> {/* disable button when there is only one month left */}
      </div>
    </div>
  );
}