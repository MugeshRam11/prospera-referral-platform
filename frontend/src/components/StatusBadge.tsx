import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase();

  const getLabel = (s: string) => {
    switch (s.toUpperCase()) {
      case 'SUBMITTED':
        return 'Submitted';
      case 'ASSIGNED':
        return 'Assigned';
      case 'CONTACTED':
        return 'Contacted';
      case 'QUALIFIED':
        return 'Qualified';
      case 'PROPOSAL_SENT':
        return 'Proposal Sent';
      case 'NEGOTIATION':
        return 'Negotiation';
      case 'WON':
        return 'Deal Won';
      case 'LOST':
        return 'Lost';
      case 'AVAILABLE':
        return 'Available';
      case 'REQUESTED':
        return 'Requested';
      case 'PROCESSING':
        return 'Processing';
      case 'PAID':
        return 'Paid';
      case 'VERIFIED':
        return 'Verified';
      case 'PENDING_REVIEW':
        return 'Under Review';
      default:
        return s;
    }
  };

  return (
    <span className={`status-badge ${normalized}`}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block',
        }}
      />
      {getLabel(status)}
    </span>
  );
};
