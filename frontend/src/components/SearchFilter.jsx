import React, { useState } from 'react';
import { t } from '../utils/i18n';

export default function SearchFilter({ events, setFilteredEvents }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const handleFilter = () => {
    let filtered = events;
    if (search) {
      filtered = filtered.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase()));
    }
    if (category !== 'all') {
      filtered = filtered.filter(e => e.category === category);
    }
    setFilteredEvents(filtered);
  };

  React.useEffect(() => {
    handleFilter();
  }, [search, category, events]);

  return (
    <div className="search-filter">
      <input type="text" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
      <select value={category} onChange={e => setCategory(e.target.value)}>
        <option value="all">{t('all_categories')}</option>
        <option value="workshop">{t('workshops')}</option>
        <option value="event">{t('events')}</option>
        <option value="product">{t('products')}</option>
      </select>
    </div>
  );
}