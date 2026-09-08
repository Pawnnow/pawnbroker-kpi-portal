const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="font-bold text-primary">{title}</h3>
    <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
  </div>
);

const BudgetInstructions = () => (
  <div className="bg-card border border-border rounded-lg p-6 space-y-6">
    <div>
      <h2 className="text-xl font-bold">Pawn Gorillas Mastermind — Budget &amp; Cash Flow Planner</h2>
      <p className="text-sm text-muted-foreground mt-1">How the planner is organized (month by month).</p>
    </div>

    <Section title="1. Category Setup">
      <p>Enter the income and expense categories that fit your store. Leave a category at $0 if it doesn't apply.</p>
    </Section>

    <Section title="2. Historical years">
      <p>
        Enter actual monthly dollars for each category. Monthly detail is what makes cash flow forecasting real — a flat
        annual number hides the slow months and the anniversary-sale spike. Annual totals and year-over-year growth
        calculate automatically.
      </p>
      <p>
        Payroll Tax (FICA &amp; FUTA/SUTA) is auto-calculated as a percentage of Executive + Staff Wages, including the
        employer's matching share. Set each store's rate in the Payroll Tax Rate settings on each year — every year can
        have its own rate. 7.65% is pre-filled for FICA; FUTA/SUTA varies by state and starts at 0%.
      </p>
    </Section>

    <Section title="3. Projected years">
      <p>
        Enter one % adjustment per category. That % is applied to every month of the prior year's actual pattern, so the
        projection keeps last year's real seasonality (busy months stay busy) while scaling the category up or down.
      </p>
      <p>
        Example: Staff Wages +12% because you're adding a part-timer; Marketing +40% only shows up correctly if last
        year's anniversary-sale month already spiked — the % scales that same shape.
      </p>
    </Section>

    <Section title="4. Pawn Activity, Inventory &amp; Sales Tax">
      <p>These are the real burn-rate drivers. This section does not feed Net Operating Income; it drives Cash Flow and Inventory instead.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Pawn Loans Originated</strong> — cash out when you fund a loan against collateral.</li>
        <li><strong>Pawn Redeems (Principal)</strong> — cash in when a customer repays. Interest/fee revenue stays in PSC Collected under Income, so it isn't double-counted.</li>
        <li><strong>Pawn Defaults</strong> — non-cash; the defaulted loan's value converts into Inventory.</li>
        <li><strong>Buys</strong> — cash out for outright purchases, and adds straight to Inventory.</li>
        <li><strong>Beginning/Ending Inventory</strong> — rolls forward automatically: Beginning + Buys + Defaults − COGS = Ending, which becomes next month's Beginning.</li>
        <li><strong>Sales Tax</strong> — set State / County / City rates (leave others at 0% for a lump-sum rate). Sales Tax Collected = Taxable Sales × Total Rate (cash in); Sales Tax Remitted = last month's collected amount (cash out, one month behind).</li>
      </ul>
    </Section>

    <Section title="5. Cash Flow">
      <p>
        Beginning cash, cash in/out from operations, loans/redeems/buys, the burn rate (Loans + Buys), sales tax
        collected and remitted, net cash flow, and ending cash — pulled directly from the monthly figures above.
      </p>
    </Section>

    <Section title="6. Dashboard">
      <p>One-page summary of Total Income, Total Expenses, and Net Operating Income, plus burn rate, ending inventory, and year-end cash position where available.</p>
    </Section>

    <Section title="7. Budget vs Actual">
      <p>Budget pulls automatically; enter actual dollars each month and variance $ / % calculate on their own — an easy way to see if a store is running over or under its own plan.</p>
    </Section>

    <Section title="Tips">
      <ul className="list-disc pl-5 space-y-1">
        <li>Leave a category at $0 if it doesn't apply.</li>
        <li>If one month needs a different adjustment than the rest of the year (e.g. only April jumps for an anniversary sale), override that single projected month directly — it will no longer move automatically when you change that row's overall % adjustment.</li>
        <li>Net Operating Income = Total Income − COGS − Total Expenses.</li>
      </ul>
    </Section>
  </div>
);

export default BudgetInstructions;
