```
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Truck, Printer, FileSpreadsheet, Trash2, Filter } from 'lucide-react';

function App() {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState('');
  
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');

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
    } else {
      // Only remove if we explicitly cleared it (handled in clearData), 
      // but here we might want to avoid auto-clearing if data just initialized empty.
      // Better to handle saving explicitly in process/delete or debounce here.
      // For simplicity, we'll save in the modify functions.
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
      const jsonData = XLSX.utils.sheet_to_json(ws);
      
      // Append new data or replace? User likely wants to replace or add.
      // For now, let's assume replace as per previous behavior, 
      // OR we could concat if we want to "add" more excel files.
      // Let's stick to replace for now to minimize complexity unless requested.
      setData(jsonData);
      localStorage.setItem('transportData', JSON.stringify(jsonData));
    };
    reader.readAsBinaryString(file);
  };

  const getJsDate = (dateVal) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'number') {
        return new Date(Math.round((dateVal - 25569)*86400*1000));
    }
    return new Date(dateVal);
  }

  // Derived state for dropdowns (updates automatically when data changes)
  const { drivers, months, weeks } = useMemo(() => {
    const d = new Set();
    const m = new Set();
    const w = new Set();

    data.forEach(row => {
        if(row.Conductor) d.add(row.Conductor);
        
        const date = getJsDate(row['F.Carga'] || row['Fecha Carga']);
        if (date && !isNaN(date)) {
            const monthStr = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
            m.add(monthStr);
            
            const oneJan = new Date(date.getFullYear(), 0, 1);
            const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
            const weekNum = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
            w.add(`Semana ${ week
