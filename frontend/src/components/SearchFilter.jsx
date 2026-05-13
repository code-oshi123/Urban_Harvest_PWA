import React, { useState } from 'react';

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
      <input type="text" placeholder="🔍 Search events, workshops..." value={search} onChange={e => setSearch(e.target.value)} />
      <select value={category} onChange={e => setCategory(e.target.value)}>
        <option value="all">All Categories</option>
        <option value="workshop">Workshop</option>
        <option value="event">Event</option>
        <option value="product">Product</option>
      </select>
    </div>
  );
}