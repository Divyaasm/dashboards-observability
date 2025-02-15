/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import _ from 'lodash';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { HttpSetup } from '../../../../../../../src/core/public';
import { TRACE_ANALYTICS_DATE_FORMAT } from '../../../../../common/constants/trace_analytics';
import { TraceAnalyticsMode } from '../../home';
import { handleSpansFlyoutRequest } from '../../requests/traces_request_handler';
import { microToMilliSec, nanoToMilliSec } from '../common/helper_functions';
import { FlyoutListItem } from './flyout_list_item';

export function SpanDetailFlyout(props: {
  http: HttpSetup;
  spanId: string;
  isFlyoutVisible: boolean;
  closeFlyout: () => void;
  addSpanFilter: (field: string, value: any) => void;
  mode: TraceAnalyticsMode;
}) {
  const { mode } = props;
  const [span, setSpan] = useState<any>({});

  useEffect(() => {
    handleSpansFlyoutRequest(props.http, props.spanId, setSpan, mode);
  }, [props.spanId]);

  const getListItem = (field: string, title: React.ReactNode, description: React.ReactNode) => {
    return (
      <FlyoutListItem
        title={title}
        description={description}
        key={`list-item-${title}`}
        addSpanFilter={() => props.addSpanFilter(field, span[field])}
      />
    );
  };

  const isEmpty = (value) => {
    return (
      value == null ||
      (value.hasOwnProperty('length') && value.length === 0) ||
      (value.constructor === Object && Object.keys(value).length === 0)
    );
  };

  const renderContent = () => {
    if (!span || _.isEmpty(span)) return '-';
    const overviewList = [
      getListItem(
        'spanId',
        'Span ID',
        (mode === 'data_prepper' ? span.spanId : span.spanID) ? (
          <EuiFlexGroup gutterSize="xs" style={{ marginTop: -4, marginBottom: -4 }}>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={mode === 'data_prepper' ? span.spanId : span.spanID}>
                {(copy) => (
                  <EuiButtonIcon aria-label="copy-button" onClick={copy} iconType="copyClipboard" />
                )}
              </EuiCopy>
            </EuiFlexItem>
            <EuiFlexItem>{mode === 'data_prepper' ? span.spanId : span.spanID}</EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          '-'
        )
      ),
      getListItem(
        'parentSpanId',
        'Parent span ID',
        (mode === 'data_prepper' ? span.parentSpanId : span.references.length) ? (
          <EuiFlexGroup gutterSize="xs" style={{ marginTop: -4, marginBottom: -4 }}>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={mode === 'data_prepper' ? span.parentSpanId : span.references[0].spanID}>
                {(copy) => (
                  <EuiButtonIcon aria-label="copy-button" onClick={copy} iconType="copyClipboard" />
                )}
              </EuiCopy>
            </EuiFlexItem>
            <EuiFlexItem>{mode === 'data_prepper' ? span.parentSpanId : span.references[0].spanID}</EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          '-'
        )
      ),
      getListItem('serviceName', 'Service', (mode === 'data_prepper' ? span.serviceName : span.process['serviceName']) || '-'),
      getListItem('name', 'Operation', (mode === 'data_prepper' ? span.name : span.operationName) || '-'),
      getListItem(
        'durationInNanos',
        'Duration',
        `${(mode === 'data_prepper' ? _.round(nanoToMilliSec(Math.max(0, span.durationInNanos)), 2) : _.round(microToMilliSec(Math.max(0, span.duration)), 2))} ms`
      ),
      getListItem(
        'startTime',
        'Start time',
        mode === 'data_prepper' ? moment(span.startTime).format(TRACE_ANALYTICS_DATE_FORMAT) : moment(_.round(microToMilliSec(Math.max(0, span.startTime)), 2)).format(TRACE_ANALYTICS_DATE_FORMAT)
      ),
      getListItem('endTime', 'End time',  mode === 'data_prepper' ? moment(span.endTime).format(TRACE_ANALYTICS_DATE_FORMAT) : moment(_.round(microToMilliSec(Math.max(0, span.startTime + span.duration)), 2)).format(TRACE_ANALYTICS_DATE_FORMAT)),
      getListItem(
        'status.code',
        'Errors',
        (mode === 'data_prepper' ? span['status.code'] === 2 : span.tag['error']) ? (
          <EuiText color="danger" size="s" style={{fontWeight: 700}}>
            Yes
          </EuiText>
        ) : (
          'No'
        )
      ),
    ];
    const ignoredKeys = new Set([
      'spanId',
      'spanID',
      'parentSpanId',
      'serviceName',
      'name',
      'operationName',
      'durationInNanos',
      'duration',
      'startTime',
      'startTimeMillis',
      'endTime',
      'status.code',
      'events',
      'traceId',
      'traceID',
      'traceGroup',
      'traceGroupFields.endTime',
      'traceGroupFields.statusCode',
      'traceGroupFields.durationInNanos',
    ]);
    const attributesList = Object.keys(span)
      .filter((key) => !ignoredKeys.has(key))
      .sort((keyA, keyB) => {
        const isANull = isEmpty(span[keyA]);
        const isBNull = isEmpty(span[keyB]);
        if ((isANull && isBNull) || (!isANull && !isBNull)) return keyA < keyB ? -1 : 1;
        if (isANull) return 1;
        return -1;
      })
      .map((key) => {
        if (isEmpty(span[key])) return getListItem(key, key, '-');
        let value = span[key];
        if (typeof value === 'object') value = JSON.stringify(value);
        return getListItem(key, key, value);
      });

    const eventsComponent = _.isEmpty(span['events']) ? null : (
      <>
        <EuiText size="m">
          <span className="panel-title">Event</span>
        </EuiText>
        <EuiCodeBlock language="json" paddingSize="s" isCopyable overflowHeight={400}>
          {JSON.stringify(span['events'], null, 2)}
        </EuiCodeBlock>
        <EuiSpacer size="xs" />
        <EuiHorizontalRule margin="s" />
      </>
    );

    return (
      <>
        <EuiText size="m">
          <span className="panel-title">Overview</span>
        </EuiText>
        <EuiSpacer size="s" />
        {overviewList}
        <EuiSpacer size="xs" />
        <EuiHorizontalRule margin="s" />
        {eventsComponent}
        <EuiText size="m">
          <span className="panel-title">Span attributes</span>
          {attributesList.length === 0 || attributesList.length ? (
            <span className="panel-title-count">{` (${attributesList.length})`}</span>
          ) : null}
        </EuiText>
        <EuiSpacer size="s" />
        {attributesList}
      </>
    );
  };

  return (
    <>
      <EuiFlyout data-test-subj="spanDetailFlyout" onClose={props.closeFlyout} size="s">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle>
            <h2>Span detail</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{renderContent()}</EuiFlyoutBody>
      </EuiFlyout>
    </>
  );
}
