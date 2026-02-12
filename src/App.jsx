import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Truck, Printer, FileSpreadsheet } from 'lucide-react';

function App() {
    const [data, setData] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [selectedDriver, setSelectedDriver] = useState('');
    const [fileName, setFileName] = useState('');

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const jsonData = XLSX.utils.sheet_to_json(ws);
            processData(jsonData);
        };
        reader.readAsBinaryString(file);
    };

    const processData = (jsonData) => {
        // Extract unique drivers
        const uniqueDrivers = [...new Set(jsonData.map(row => row.Conductor).filter(Boolean))].sort();
        setDrivers(uniqueDrivers);
        setData(jsonData);
    };

    const filteredData = useMemo(() => {
        if (!selectedDriver) return [];
        return data.filter(row => row.Conductor === selectedDriver);
    }, [data, selectedDriver]);

    const totalImporte = useMemo(() => {
        return filteredData.reduce((sum, row) => {
            const val = parseFloat(row['Precio'] || row['Euros'] || row['Importe'] || 0);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    }, [filteredData]);

    const formatDate = (dateVal) => {
        if (!dateVal) return '';
        // Handle Excel serial date
        if (typeof dateVal === 'number') {
            const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
            return date.toLocaleDateString('es-ES');
        }
        // Handle string date
        return new Date(dateVal).toLocaleDateString('es-ES');
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
            <div className="max-w-5xl mx-auto print:max-w-none">

                {/* Header - Hidden in Print if needed, or styled simpler */}
                <header className="mb-8 flex justify-between items-center print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-lg text-white">
                            <Truck size={24} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">Visor de Transportes</h1>
                    </div>
                    {data.length > 0 && (
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <Printer size={20} />
                            Imprimir Informe
                        </button>
                    )}
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

                        {/* Driver Selector - Hidden in Print */}
                        <div className="bg-white p-6 rounded-lg shadow-sm print:hidden">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Conductor</label>
                            <select
                                value={selectedDriver}
                                onChange={(e) => setSelectedDriver(e.target.value)}
                                className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">-- Elige un conductor --</option>
                                {drivers.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        {selectedDriver && (
                            <div id="printable-area" className="bg-white p-8 rounded-lg shadow-sm print:shadow-none print:p-0">

                                {/* Report Header */}
                                <div className="border-b pb-6 mb-6">
                                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Informe de Transportes</h2>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-gray-500">Conductor</p>
                                            <p className="text-xl font-semibold text-blue-600">{selectedDriver}</p>
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
                                        <p className="text-sm text-blue-600 font-medium">Total Viajes</p>
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
                                                <th className="p-3 font-semibold text-gray-600">Origen</th>
                                                <th className="p-3 font-semibold text-gray-600">Destino</th>
                                                <th className="p-3 font-semibold text-gray-600">Mat. Contenedor</th>
                                                <th className="p-3 font-semibold text-gray-600 text-right">Importe</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-3 text-gray-700">{formatDate(row['F.Carga'] || row['Fecha Carga'])}</td>
                                                    <td className="p-3 text-gray-700">
                                                        <div className="font-medium">{row['Pobl. Carga'] || row['Población Origen']}</div>
                                                        <div className="text-xs text-gray-500">{row['Ori.Emp'] || row['Empresa Origen']}</div>
                                                    </td>
                                                    <td className="p-3 text-gray-700">
                                                        <div className="font-medium">{row['Pobl. Descarga'] || row['Población Destino']}</div>
                                                        <div className="text-xs text-gray-500">{row['Des.Emp'] || row['Empresa Destino']}</div>
                                                    </td>
                                                    <td className="p-3 text-gray-700 font-mono">{row['Mat. Cont.'] || row['Matrícula Contenedor']}</td>
                                                    <td className="p-3 text-gray-900 font-semibold text-right">
                                                        {parseFloat(row['Precio'] || row['Euros'] || row['Importe'] || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                                            <tr>
                                                <td colSpan="4" className="p-3 text-right text-gray-600">TOTAL</td>
                                                <td className="p-3 text-right text-black">
                                                    {totalImporte.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
