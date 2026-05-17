import React, { createContext, useState, useEffect, useContext } from 'react';

export const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');

  useEffect(() => {
    const fetchWithTimeout = (url, timeout = 3000) => {
        return Promise.race([
            fetch(url),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
        ]);
    };

    const applyCurrency = (code) => {
        setCurrencyCode(code);
        try {
            const symbol = (0).toLocaleString(
                navigator.language || 'en-US',
                { style: 'currency', currency: code, minimumFractionDigits: 0, maximumFractionDigits: 0 }
            ).replace(/\d/g, '').trim();
            setCurrencySymbol(symbol || code);
        } catch(e) {
            setCurrencySymbol(code);
        }
    };

    const fetchCurrency = async () => {
      try {
        // Primary API: ipwho.is
        let response = await fetchWithTimeout('https://ipwho.is/');
        let data = await response.json();
        if (data && data.success && data.currency && data.currency.code) {
           applyCurrency(data.currency.code);
           return;
        }
      } catch (err) {
         console.warn("ipwho.is failed, trying backup...");
      }

      try {
        // Backup API: ipapi.co
        let response = await fetchWithTimeout('https://ipapi.co/json/');
        let data = await response.json();
        if (data && data.currency) {
           applyCurrency(data.currency);
           return;
        }
      } catch (error) {
        console.error('All IP currency APIs failed. Falling back to timezone detection.');
        
        // Final fallback using browser timezone
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) {
            if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('Asia/Colombo')) {
                applyCurrency('INR');
            } else if (tz.includes('Europe/London')) {
                applyCurrency('GBP');
            } else if (tz.includes('Europe')) {
                applyCurrency('EUR');
            } else if (tz.includes('Australia')) {
                applyCurrency('AUD');
            } else if (tz.includes('Toronto') || tz.includes('Vancouver')) {
                applyCurrency('CAD');
            }
            // Add more as needed, else defaults to USD
        }
      }
    };

    fetchCurrency();
  }, []);

  const exchangeRates = {
    USD: 1,
    INR: 83.5,
    EUR: 0.92,
    GBP: 0.79,
    AUD: 1.52,
    CAD: 1.37,
    AED: 3.67,
    SGD: 1.35,
    JPY: 154.5
  };

  const formatCurrency = (amount) => {
    try {
      const rate = exchangeRates[currencyCode] || 1;
      const convertedAmount = amount * rate;

      return new Intl.NumberFormat(navigator.language || undefined, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(convertedAmount);
    } catch (e) {
      return `${currencySymbol}${amount}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currencyCode, currencySymbol, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
