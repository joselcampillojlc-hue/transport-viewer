import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Truck, Printer, FileSpreadsheet, Trash2, Filter, FileUp } from 'lucide-react';

function App() {
    const [data, setData] = useState([]);
    const [fileName, setFileName] = useState('');

    const [selectedDriver, setSelectedDriver] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedWeek, setSelectedWeek] = useState('');

    const fileInputRef = useRef(null);

    const [debugInfo, setDebugInfo] = useState(null);

    // Load data from localStorage on mount
    useEffect(() => {
        const savedData = localStorage.getItem('transportData');
        const savedFileName = localStorage.getItem('transportFileName');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                setData(parsedData);
                if (savedFileName) setFileName(savedFileName);
            } catch (e) {
                console.error("Error loading data", e);
            }
        }
    }, []);

    // Sync data to localStorage whenever it changes
    useEffect(() => {
        if (data.length > 0) {
            localStorage.setItem('transportData', JSON.stringify(data));
        }
    }, [data]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        localStorage.setItem('transportFileName', file.name);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];

            // Convert to array of arrays to find the header row
            const dataArrays = XLSX.utils.sheet_to_json(ws, { header: 1 });

            let headerRowIndex = 0;
            const keywords = ['Conductor', 'Fecha', 'Precio', 'Importe', 'Cliente', 'Origen', 'Destino'];

            // Find row with most matching keywords
            let maxMatches = 0;
            dataArrays.slice(0, 20).forEach((row, index) => {
                if (!Array.isArray(row)) return;
                const matches = row.filter(cell =>
                    typeof cell === 'string' && keywords.some(k => cell.toLowerCase().includes(k.toLowerCase()))
                ).length;

                if (matches > maxMatches) {
                    maxMatches = matches;
                    headerRowIndex = index;
                }
            });

            // Read again with the correct header row
            const jsonData = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });

            // Set Debug Info
            if (jsonData.length > 0) {
                setDebugInfo({
                    detectedHeaderRow: headerRowIndex,
                    firstRowKeys: Object.keys(jsonData[0]),
                    sampleRow: jsonData[0]
                });
            }

            setData(jsonData);
            localStorage.setItem('transportData', JSON.stringify(jsonData));

            // Reset filters when new file is loaded
            setSelectedDriver('');
            setSelectedMonth('');
            setSelectedWeek('');
        };
        reader.readAsBinaryString(file);
    };

    const triggerFileUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Helper to find key case-insensitively and handle variations
    const findVal = (row, possibleKeys) => {
        const rowKeys = Object.keys(row);
        for (const key of possibleKeys) {
            // Exact match
            if (row[key] !== undefined) return row[key];
            // Case insensitive match
            const foundKey = rowKeys.find(k => k.toLowerCase() === key.toLowerCase());
            if (foundKey) return row[foundKey];
        }
        return undefined;
    };

    const getJsDate = (row) => {
        const val = findVal(row, ['F.Carga', 'Fecha Carga', 'Fecha', 'Date']);
        if (!val) return null;
        if (typeof val === 'number') {
            return new Date(Math.round((val - 25569) * 86400 * 1000));
        }
        return new Date(val);
    }

    // Derived state for dropdowns (updates automatically when data changes)
    const { drivers, months, weeks } = useMemo(() => {
        const d = new Set();
        const m = new Set();
        const w = new Set();

        data.forEach(row => {
            const conductor = findVal(row, ['Conductor', 'Chofer', 'Driver']);
            if (conductor) d.add(conductor);

            const date = getJsDate(row);
            if (date && !isNaN(date)) {
                const monthStr = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                m.add(monthStr);

                const oneJan = new Date(date.getFullYear(), 0, 1);
                const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
                const weekNum = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
                w.add(`Semana ${weekNum} - ${date.getFullYear()}`);
            }
        });

        return {
            drivers: [...d].sort(),
            months: [...m].sort(),
            weeks: [...w].sort((a, b) => {
                const getNum = s => parseInt(s.match(/\d+/)[0] || 0);
                return getNum(a) - getNum(b);
            })
        };
    }, [data]);

    const clearData = () => {
        let newData = [...data];
        let confirmMsg = '';

        if (selectedWeek) {
            confirmMsg = `¿Estás seguro de que quieres borrar los datos de la ${selectedWeek}?`;
        } else if (selectedMonth) {
            confirmMsg = `¿Estás seguro de que quieres borrar los datos de ${selectedMonth}?`;
        } else {
            confirmMsg = '¿Estás seguro de que quieres borrar TODOS los datos guardados?';
        }

        if (!window.confirm(confirmMsg)) return;

        if (selectedWeek) {
            newData = newData.filter(row => {
                const date = getJsDate(row);
                if (!date) return true;
                const oneJan = new Date(date.getFullYear(), 0, 1);
                const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
                const weekNum = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
                const weekStr = `Semana ${weekNum} - ${date.getFullYear()}`;
                return weekStr !== selectedWeek;
            });
            setSelectedWeek('');
        } else if (selectedMonth) {
            newData = newData.filter(row => {
                const date = getJsDate(row);
                if (!date) return true;
                const monthStr = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                return monthStr !== selectedMonth;
            });
            setSelectedMonth('');
        } else {
            newData = [];
            setFileName('');
            localStorage.removeItem('transportFileName');
            setSelectedDriver('');
            setSelectedMonth('');
            setSelectedWeek('');
        }

        setData(newData);
        localStorage.setItem('transportData', JSON.stringify(newData));
        if (newData.length === 0) {
            localStorage.removeItem('transportData');
        }
    };

    const getDeleteButtonText = () => {
        if (selectedWeek) return `Borrar ${selectedWeek}`;
        if (selectedMonth) return `Borrar ${selectedMonth}`;
        return "Borrar Todo";
    };

    const filteredData = useMemo(() => {
        return data.filter(row => {
            // Driver filter
            const conductor = findVal(row, ['Conductor', 'Chofer', 'Driver']);
            if (selectedDriver && conductor !== selectedDriver) return false;

            const date = getJsDate(row);
            if (!date) return false;

            // Month filter
            if (selectedMonth) {
                const monthStr = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                if (monthStr !== selectedMonth) return false;
            }

            // Week filter
            if (selectedWeek) {
                const oneJan = new Date(date.getFullYear(), 0, 1);
                const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
                const weekNum = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
                const weekStr = `Semana ${weekNum} - ${date.getFullYear()}`;
                if (weekStr !== selectedWeek) return false;
            }

            return true;
        });
    }, [data, selectedDriver, selectedMonth, selectedWeek]);

    const totalImporte = useMemo(() => {
        return filteredData.reduce((sum, row) => {
            const val = parseFloat(findVal(row, ['Precio', 'Euros', 'Importe', 'Total']) || 0);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    }, [filteredData]);

    // New helper for rendering
    const renderDate = (row) => {
        const date = getJsDate(row);
        return date ? date.toLocaleDateString('es-ES') : '';
    }

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
            <div className="max-w-6xl mx-auto print:max-w-none">

                {/* Header */}
                <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-lg text-white">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Visor de Transportes</h1>
                            {fileName && <p className="text-sm text-gray-500">Archivo: {fileName}</p>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {data.length > 0 && (
                            <>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    ref={fileInputRef}
                                />
                                <button
                                    onClick={triggerFileUpload}
                                    className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
                                >
                                    <FileUp size={20} />
                                    Cambiar Archivo
                                </button>
                                <button
                                    onClick={clearData}
                                    className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                                >
                                    <Trash2 size={20} />
                                    {getDeleteButtonText()}
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    <Printer size={20} />
                                    Imprimir
                                </button>
                            </>
                        )}
                    </div>
                </header>

                {/* File Upload Section */}
                {data.length === 0 && (
                    <div className="bg-white p-12 rounded-xl shadow-sm border-2 border-dashed border-gray-300 text-center">
                        <div className="mb-4 flex justify-center text-blue-500">
                            <FileSpreadsheet size={64} />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sube tu archivo Excel</h2>
                        <p className="text-gray-500 mb-6">Selecciona el archivo con los datos de transporte</p>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="file-upload"
                        />
                        <label
                            htmlFor="file-upload"
                            className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                        >
                            <Upload size={20} />
                            Seleccionar Archivo
                        </label>
                    </div>
                )}

                {/* Dashboard Content */}
                {data.length > 0 && (
                    <div className="space-y-6">

                        {/* Filters - Hidden in Print */}
                        <div className="bg-white p-6 rounded-lg shadow-sm print:hidden">
                            <div className="flex items-center gap-2 mb-4 text-gray-700 font-semibold">
                                <Filter size={20} />
                                Filtros
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Conductor</label>
                                    <select
                                        value={selectedDriver}
                                        onChange={(e) => setSelectedDriver(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Todos los conductores</option>
                                        {drivers.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => {
                                            setSelectedMonth(e.target.value);
                                            if (e.target.value) setSelectedWeek('');
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Todos los meses</option>
                                        {months.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Semana</label>
                                    <select
                                        value={selectedWeek}
                                        onChange={(e) => {
                                            setSelectedWeek(e.target.value);
                                            if (e.target.value) setSelectedMonth('');
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Todas las semanas</option>
                                        {weeks.map(w => (
                                            <option key={w} value={w}>{w}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {(selectedMonth || selectedWeek) && (
                                <div className="mt-2 text-sm text-gray-500">
                                    * El botón "Borrar" eliminará solo los datos del filtro seleccionado ({selectedWeek || selectedMonth}).
                                </div>
                            )}
                        </div>

                        {/* Report View */}
                        <div id="printable-area" className="bg-white p-8 rounded-lg shadow-sm print:shadow-none print:p-0">

                            {/* Report Header */}
                            <div className="border-b pb-6 mb-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Informe de Transportes</h2>
                                        <div className="space-y-1 text-gray-600">
                                            {selectedDriver && <p>Conductor: <span className="font-semibold text-blue-600">{selectedDriver}</span></p>}
                                            {selectedMonth && <p>Mes: <span className="font-semibold">{selectedMonth}</span></p>}
                                            {selectedWeek && <p>Semana: <span className="font-semibold">{selectedWeek}</span></p>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-500">Fecha de Emisión</p>
                                        <p className="font-medium">{new Date().toLocaleDateString('es-ES')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 gap-4 mb-8 print:mb-4">
                                <div className="bg-blue-50 p-4 rounded-lg print:border print:bg-white">
                                    <p className="text-sm text-blue-600 font-medium">Total Viajes Seleccionados</p>
                                    <p className="text-2xl font-bold text-blue-900">{filteredData.length}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg print:border print:bg-white">
                                    <p className="text-sm text-green-600 font-medium">Total Importe</p>
                                    <p className="text-2xl font-bold text-green-900">
                                        {totalImporte.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                    </p>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                                        <tr>
                                            <th className="p-3 font-semibold text-gray-600">Fecha</th>
                                            {!selectedDriver && <th className="p-3 font-semibold text-gray-600">Conductor</th>}
                                            <th className="p-3 font-semibold text-gray-600">Origen</th>
                                            <th className="p-3 font-semibold text-gray-600">Destino</th>
                                            <th className="p-3 font-semibold text-gray-600">Mat. Contenedor</th>
                                            <th className="p-3 font-semibold text-gray-600 text-right">Precio</th>
                                            <th className="p-3 font-semibold text-gray-600 text-right">Precio+Adicional</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-3 text-gray-700">{renderDate(row)}</td>
                                                {!selectedDriver && <td className="p-3 text-gray-700 font-medium">{findVal(row, ['Conductor', 'Chofer', 'Driver'])}</td>}
                                                <td className="p-3 text-gray-700">
                                                    <div className="font-medium">{findVal(row, ['Pobl. Carga', 'Población Origen', 'Origen'])}</div>
                                                    <div className="text-xs text-gray-500">{findVal(row, ['Ori.Emp', 'Empresa Origen'])}</div>
                                                </td>
                                                <td className="p-3 text-gray-700">
                                                    <div className="font-medium">{findVal(row, ['Pobl. Descarga', 'Población Destino', 'Destino'])}</div>
                                                    <div className="text-xs text-gray-500">{findVal(row, ['Des.Emp', 'Empresa Destino'])}</div>
                                                </td>
                                                <td className="p-3 text-gray-700 font-mono">{findVal(row, ['Mat. Cont.', 'Matrícula Contenedor', 'Matricula', 'Contenedor'])}</td>
                                                <td className="p-3 text-gray-900 font-semibold text-right">
                                                    {parseFloat(findVal(row, ['Precio', 'Base']) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-3 text-gray-900 font-semibold text-right">
                                                    {parseFloat(findVal(row, ['Euros', 'Importe', 'Total']) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                                        <tr>
                                            <td colSpan={!selectedDriver ? "6" : "5"} className="p-3 text-right text-gray-600">TOTAL</td>
                                            <td className="p-3 text-right text-black">
                                                {totalImporte.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {filteredData.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    No hay datos que coincidan con los filtros seleccionados.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Debug Info */}
                {debugInfo && (
                    <div className="mt-8 p-4 bg-gray-200 rounded text-xs font-mono overflow-auto print:hidden">
                        <h3 className="font-bold text-gray-700 mb-2">Información de Depuración (Si no ves datos, envíame esto)</h3>
                        <p>Fila de cabecera detectada (índice): {debugInfo.detectedHeaderRow}</p>
                        <p>Columnas encontradas: {JSON.stringify(debugInfo.firstRowKeys)}</p>
                        <p>Ejemplo de primera fila: {JSON.stringify(debugInfo.sampleRow)}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
