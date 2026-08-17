import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const Home = () => {
  return (
    <div className="flex flex-col space-y-24 pb-12">
      {/* Hero Section */}
      <section className="text-center pt-16 sm:pt-24">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900">
          Emergency Blood Matching <br className="hidden sm:block" />
          <span className="text-primary">When Seconds Count</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          BloodLink connects hospitals and patients with nearby, eligible blood donors in real-time. No more frantic social media posts—just fast, reliable matching.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/register?role=REQUESTER">
            <Button size="lg" className="w-full sm:w-auto text-base">
              Request Blood Now
            </Button>
          </Link>
          <Link to="/register?role=DONOR">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-base">
              Become a Donor
            </Button>
          </Link>
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-100">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">How BloodLink Works</h2>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">A seamless, location-based platform designed to drastically reduce the time it takes to find compatible blood.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-primary text-2xl font-bold">1</div>
            <h3 className="text-xl font-semibold text-slate-900">Create a Request</h3>
            <p className="text-slate-600">Hospitals or patients submit an urgent request specifying blood group, units needed, and location.</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-primary text-2xl font-bold">2</div>
            <h3 className="text-xl font-semibold text-slate-900">Smart Matching</h3>
            <p className="text-slate-600">Our engine instantly identifies and alerts nearby, compatible donors who are currently available.</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-primary text-2xl font-bold">3</div>
            <h3 className="text-xl font-semibold text-slate-900">Save a Life</h3>
            <p className="text-slate-600">Donors accept the request and proceed to the hospital. Real-time coordination ensures immediate fulfillment.</p>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="text-center max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900">Privacy & Safety First</h2>
        <p className="mt-4 text-slate-600">
          We protect your data. Donor home locations are never shared publicly. Geographic matching is approximate and strictly used for emergency routing. Final donation eligibility is always determined by qualified medical professionals on-site.
        </p>
      </section>
    </div>
  );
};

export default Home;
