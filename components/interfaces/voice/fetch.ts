// useNgrokFetch.js

import { useState, useEffect } from 'react';
import axios from 'axios';

const useFetch = (endpoint: string, ): { data: string | null, loading: boolean, error: any } => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const baseUrl = process.env.EXPO_PUBLIC_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${baseUrl}${endpoint}`);
        setData(response.data);
      } catch (err: any) {
        console.error('Error fetching data from Ngrok endpoint:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  return { data, loading, error };
};

export default useFetch;
