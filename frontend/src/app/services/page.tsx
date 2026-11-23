'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import palmImg from '../../assets/pexels-abid-bin-nazar-150086727-10514386.webp';
import downtownImg from '../../assets/iStock-2070679748.webp';
import dubaiHillsImg from '../../assets/iStock-1419182406.webp';
import yasImg from '../../assets/iStock-1768866276.webp';
import {
  Home,
  CreditCard,
  Award,
  Briefcase,
  Landmark,
  Building2,
  ArrowRight,
  Search,
  Sparkles,
  MapPin,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatAED } from '@/lib/utils';

// Verified Services Hub Data
const ALL_SERVICES = [
  {
    id: 'property',
    title: 'Property & Real Estate Advisory',
    category: 'Real Estate',
    commission: '1.5% Partner Commission',
    badge: 'High Value',
    icon: Home,
    tagline: 'Prime Dubai & Abu Dhabi Freehold Assets',
    description: 'Bespoke acquisition advisory for ultra-luxury residential penthouses, beachfront villas, commercial office towers, and high-yield off-plan developments.',
    turnaround: '24-48 Hours Discovery',
    avgDeal: 'AED 3,500,000+',
    features: [
      'Direct developer allocations (Emaar, Nakheel, Aldar)',
      'Off-market trophy assets & private listings',
      'End-to-end conveyance & Dubai Land Department (DLD) escrow support',
    ],
  },
  {
    id: 'mortgage',
    title: 'Mortgage & Financing Solutions',
    category: 'Financing',
    commission: '1.0% Partner Commission',
    badge: 'Fast Approval',
    icon: CreditCard,
    tagline: 'UAE Resident & Non-Resident Financing',
    description: 'Independent mortgage brokerage securing the most competitive commercial bank borrowing rates for individual buyers and offshore investment companies.',
    turnaround: '3-5 Business Days Pre-Approval',
    avgDeal: 'AED 2,000,000+',
    features: [
      'Financing for non-resident international investors up to 60% LTV',
      'Refinancing & equity release facilities',
      'Exclusive partner lending relationships across 15+ UAE banks',
    ],
  },
  {
    id: 'golden-visa',
    title: 'UAE Golden Visa & Investor Residency',
    category: 'Immigration',
    commission: '2.0% Partner Commission',
    badge: 'Popular',
    icon: Award,
    tagline: '10-Year Self-Sponsored UAE Residency',
    description: 'Comprehensive VIP facilitation for real estate investors purchasing AED 2M+ properties, specialized entrepreneurs, and corporate C-suite executives.',
    turnaround: '7-10 Business Days Processing',
    avgDeal: 'AED 95,000 Advisory',
    features: [
      'Full title deed verification and DLD fast-track processing',
      'Family and domestic staff sponsorship included',
      'VIP medical testing and Emirates ID biometric escort',
    ],
  },
  {
    id: 'corporate-advisory',
    title: 'Corporate Advisory & SPV Structuring',
    category: 'Corporate',
    commission: '3.5% Partner Commission',
    badge: 'Institutional',
    icon: Briefcase,
    tagline: 'DIFC & ADGM Common Law Holding Vehicles',
    description: 'Special Purpose Vehicle (SPV) formation, foundation holding structures, cross-border asset segregation, and family office regulatory compliance.',
    turnaround: '2 Weeks Regulatory Filing',
    avgDeal: 'AED 350,000 Advisory',
    features: [
      'English Common Law legal protection in DIFC & ADGM',
      'Tax residency optimization & asset ring-fencing',
      'Corporate governance and compliance filing support',
    ],
  },
  {
    id: 'bank-account',
    title: 'Corporate Bank Account Opening',
    category: 'Banking',
    commission: '2.5% Partner Commission',
    badge: 'Tier-1 Banks',
    icon: Landmark,
    tagline: 'Commercial Banking with Major UAE Institutions',
    description: 'Guaranteed corporate banking facilitation tailored to UAE Mainland, Free Zone, and international holding companies requiring multi-currency accounts.',
    turnaround: '10-14 Business Days',
    avgDeal: 'AED 185,000 Facilitation',
    features: [
      'Direct partner desk routing: Emirates NBD, FAB, Mashreq, Wio',
      'High-risk profile and foreign shareholder KYC structuring',
      'Dedicated compliance officer pre-audit to eliminate rejections',
    ],
  },
  {
    id: 'company-formation',
    title: 'Company Formation & Trade Licensing',
    category: 'Licensing',
    commission: '3.0% Partner Commission',
    badge: '100% Foreign Owned',
    icon: Building2,
    tagline: 'Dubai Mainland & Premium Free Zone Licensing',
    description: 'Complete corporate licensing setup across Dubai Department of Economy & Tourism (DET) and premier Free Zones with full 100% foreign ownership.',
    turnaround: '3-5 Business Days License Issue',
    avgDeal: 'AED 145,000 Package',
    features: [
      'Mainland LLC with 100% foreign equity and zero local sponsor requirement',
      'DMCC, IFZA, DAFZA, and Abu Dhabi Global Market jurisdictions',
      'Investor residency visas and corporate establishment card',
    ],
  },
];

// Curated Property Advisory Opportunities (Part F3 Property-Focused Design)
const CURATED_PROPERTY_ADVISORY = [
  {
    id: 'prop-palm',
    title: 'Signature Beachfront Villa',
    location: 'Palm Jumeirah, Dubai',
    type: 'Ultra-Luxury Residential',
    priceGuide: 'AED 38,000,000',
    partnerCommissionEst: 'AED 570,000',
    description: 'Custom architectural beachfront estate on Frond N. Direct private beach access, infinity pool, Italian marble finishes, and smart home automation.',
    highlight: 'Prime Trophy Asset',
    image: palmImg,
  },
  {
    id: 'prop-downtown',
    title: 'Burj View Sky Penthouse',
    location: 'Downtown Dubai',
    type: 'High-Rise Penthouse',
    priceGuide: 'AED 19,500,000',
    partnerCommissionEst: 'AED 292,500',
    description: 'Duplex penthouse overlooking Burj Khalifa and Dubai Fountain. Private elevator lobby, wraparound terrace, and premium concierge service.',
    highlight: 'High Capital Appreciation',
    image: downtownImg,
  },
  {
    id: 'prop-dubai-hills',
    title: 'Fairway Golf View Mansion',
    location: 'Dubai Hills Estate',
    type: 'Golf Course Freehold Villa',
    priceGuide: 'AED 24,000,000',
    partnerCommissionEst: 'AED 360,000',
    description: 'Contemporary 6-bedroom villa overlooking the championship golf course. Basement entertainment lounge, private cinema, and lush landscaped gardens.',
    highlight: 'Family Office Favourite',
    image: dubaiHillsImg,
  },
  {
    id: 'prop-yas',
    title: 'Waterfront Marina Residence',
    location: 'Yas Island, Abu Dhabi',
    type: 'Waterfront Development',
    priceGuide: 'AED 8,500,000',
    partnerCommissionEst: 'AED 127,500',
    description: 'Exclusive marina-front freehold residences near Yas Marina Circuit and cultural district. High rental yield with guaranteed tenant demand.',
    highlight: 'Strong Rental Yield',
    image: yasImg,
  },
];

export default function ServicesDiscoveryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const filteredServices = ALL_SERVICES.filter((s) => {
    if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tagline.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Properties & Advisory Services Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Explore verified advisory verticals and submit targeted client referrals with institutional commission backing.
          </p>
        </div>
        <Link href="/referrals/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm">
            <Sparkles className="w-4 h-4 mr-2" /> Start Referral Wizard
          </Button>
        </Link>
      </div>

      {/* Main Tabs: Services Hub vs Curated Properties */}
      <Tabs defaultValue="services" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="services" className="text-sm font-semibold">
            All 6 Advisory Verticals
          </TabsTrigger>
          <TabsTrigger value="properties" className="text-sm font-semibold">
            Prime Real Estate Showcase ({CURATED_PROPERTY_ADVISORY.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: 6 Advisory Verticals */}
        <TabsContent value="services" className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search services or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
              {['ALL', 'Real Estate', 'Financing', 'Immigration', 'Corporate', 'Banking', 'Licensing'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => {
              const Icon = service.icon;
              return (
                <Card key={service.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <Badge variant="info" className="text-xs font-semibold">
                        {service.commission}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                    <p className="text-xs font-semibold text-blue-600 mt-0.5">
                      {service.tagline}
                    </p>
                    <CardDescription className="text-xs leading-relaxed mt-2">
                      {service.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4">
                    {/* Key features */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      {service.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Response SLA: <strong>{service.turnaround}</strong></span>
                      <span>Bench Value: <strong>{service.avgDeal}</strong></span>
                    </div>

                    <Link href={`/referrals/new?service=${service.id}`} className="block w-full">
                      <Button className="w-full bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors">
                        Refer Client to this Service <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 2: Curated Properties Showcase (Part F3 Property Focus) */}
        <TabsContent value="properties" className="space-y-6">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 leading-relaxed">
              <strong className="text-slate-900 block font-semibold mb-0.5">
                Property-Linked Referrals: Institutional Commission Escrow
              </strong>
              These prime residential and commercial freehold listings represent verified investment opportunities. Referring private clients to any acquisition automatically logs your 1.5% commission rights upon contract closing with the developer or seller.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CURATED_PROPERTY_ADVISORY.map((prop) => (
              <Card key={prop.id} className="overflow-hidden hover:shadow-xl transition-all border-slate-200 group">
                <div className="relative h-52 w-full overflow-hidden">
                  <Image
                    src={prop.image}
                    alt={prop.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                    <Badge className="bg-amber-400 text-slate-900 font-bold border-none text-xs shadow-sm">
                      {prop.highlight}
                    </Badge>
                    <span className="text-[11px] font-mono text-white bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/20">
                      Verified Freehold
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 z-10">
                    <h3 className="text-xl font-bold tracking-tight text-white">{prop.title}</h3>
                    <div className="flex items-center text-xs text-slate-300 mt-1 gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      <span>{prop.location}</span>
                      <span className="mx-1">•</span>
                      <span>{prop.type}</span>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {prop.description}
                  </p>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Guide Price
                      </span>
                      <p className="text-lg font-extrabold text-slate-900">{prop.priceGuide}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                        Estimated Partner Reward
                      </span>
                      <p className="text-lg font-extrabold text-emerald-600">{prop.partnerCommissionEst}</p>
                    </div>
                  </div>

                  <Link href={`/referrals/new?service=property&asset=${encodeURIComponent(prop.title)}`}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
                      Refer Client for this Property <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
