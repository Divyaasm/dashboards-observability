/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable react-hooks/exhaustive-deps */

import { EuiSpacer } from '@elastic/eui';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import {
  handleServiceMapRequest,
  handleServicesRequest,
} from '../../requests/services_request_handler';
import { FilterType } from '../common/filters/filters';
import { getValidFilterFields } from '../common/filters/filter_helpers';
import { filtersToDsl, processTimeStamp } from '../common/helper_functions';
import { ServiceMap, ServiceObject } from '../common/plots/service_map';
import { SearchBar } from '../common/search_bar';
import { ServicesProps } from './services';
import { ServicesTable } from './services_table';

export function ServicesContent(props: ServicesProps) {
  const {
    page,
    http,
    chrome,
    filters,
    query,
    startTime,
    endTime,
    appConfigs = [],
    childBreadcrumbs,
    parentBreadcrumbs,
    nameColumnAction,
    traceColumnAction,
    setFilters,
    setQuery,
    setStartTime,
    setEndTime,
    mode,
    dataPrepperIndicesExist,
    jaegerIndicesExist,
  } = props;
  const [tableItems, setTableItems] = useState([]);
  const [serviceMap, setServiceMap] = useState<ServiceObject>({});
  const [serviceMapIdSelected, setServiceMapIdSelected] = useState<
    'latency' | 'error_rate' | 'throughput'
  >('latency');
  const [redirect, setRedirect] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filteredService, setFilteredService] = useState('');

  useEffect(() => {
    chrome.setBreadcrumbs([...parentBreadcrumbs, ...childBreadcrumbs]);
    const validFilters = getValidFilterFields(mode, 'services');
    setFilters([
      ...filters.map((filter) => ({
        ...filter,
        locked: validFilters.indexOf(filter.field) === -1,
      })),
    ]);
    setRedirect(false);
  }, []);

  useEffect(() => {
    let newFilteredService = '';
    for (const filter of filters) {
      if (filter.field === 'serviceName') {
        newFilteredService = filter.value;
        break;
      }
    }
    setFilteredService(newFilteredService);
    if (!redirect && ((mode === 'data_prepper' && dataPrepperIndicesExist) || (mode === 'jaeger' && jaegerIndicesExist))) refresh(newFilteredService);
  }, [filters, appConfigs]);

  const refresh = async (currService?: string) => {
    setLoading(true);
    const DSL = filtersToDsl(mode, filters, query,processTimeStamp(startTime, mode), processTimeStamp(endTime, mode), page, appConfigs);
    // service map should not be filtered by service name
    const serviceMapDSL = _.cloneDeep(DSL);
    serviceMapDSL.query.bool.must = serviceMapDSL.query.bool.must.filter(
      (must: any) => must?.term?.serviceName == null
    );
    await Promise.all([
      handleServicesRequest(http, DSL, setTableItems, mode),
      handleServiceMapRequest(http, serviceMapDSL, mode, setServiceMap, currService || filteredService),
    ]);
    setLoading(false);
  };

  const addFilter = (filter: FilterType) => {
    for (let i = 0; i < filters.length; i++) {
      const addedFilter = filters[i];
      if (addedFilter.field === filter.field) {
        if (addedFilter.operator === filter.operator && addedFilter.value === filter.value) return;
        const newFilters = [...filters];
        newFilters.splice(i, 1, filter);
        setFilters(newFilters);
        return;
      }
    }
    const newFilters = [...filters, filter];
    setFilters(newFilters);
  };

  return (
    <>
      <SearchBar
        query={query}
        filters={filters}
        appConfigs={appConfigs}
        setFilters={setFilters}
        setQuery={setQuery}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        refresh={refresh}
        page={page}
        mode={mode}
      />
      <EuiSpacer size="m" />
      <ServicesTable
        items={tableItems}
        addFilter={addFilter}
        setRedirect={setRedirect}
        mode={mode}
        loading={loading}
        nameColumnAction={nameColumnAction}
        traceColumnAction={traceColumnAction}
        jaegerIndicesExist={jaegerIndicesExist}
        dataPrepperIndicesExist={dataPrepperIndicesExist}
      />
      <EuiSpacer size="m" />
      { (mode === 'data_prepper' && dataPrepperIndicesExist) ? 
        <ServiceMap
          addFilter={addFilter}
          serviceMap={serviceMap}
          idSelected={serviceMapIdSelected}
          setIdSelected={setServiceMapIdSelected}
          currService={filteredService}
          page={page}
        /> : (<div/>)
      }
    </>
  );
}
