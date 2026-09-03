import { useState } from "react";
import {
  useGetManufacturingPricing,
  useListManufacturers,
  useListOrders,
  useCreateOrder,
  useListProjects,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Calculator, Factory, ShoppingCart, TrendingUp, Globe, CheckCircle, Loader2, Download, Search, Filter, Star, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api-url";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const PRINT_METHODS = [
  { value: "screen_print", label: "Screen Print" },
  { value: "dtg", label: "DTG" },
  { value: "embroidery", label: "Embroidery" },
  { value: "sublimation", label: "Sublimation" },
] as const;

type PrintMethod = (typeof PRINT_METHODS)[number]["value"];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/10 text-blue-500",
  confirmed: "bg-green-500/10 text-green-500",
  in_production: "bg-orange-500/10 text-orange-500",
  shipped: "bg-purple-500/10 text-purple-500",
  delivered: "bg-green-600/10 text-green-600",
  cancelled: "bg-destructive/10 text-destructive",
};

function CurrencyValue({ value }: { value: number }) {
  return <span>${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
}

export default function Manufacturing() {
  const [printMethod, setPrintMethod] = useState<PrintMethod>("screen_print");
  const [quantity, setQuantity] = useState(100);
  const [retailPrice, setRetailPrice] = useState(35);
  const [mfrSearch, setMfrSearch] = useState("");
  const [mfrTypeFilter, setMfrTypeFilter] = useState("all");
  const [moqMax, setMoqMax] = useState(500);
  const [turnaroundMax, setTurnaroundMax] = useState(30);
  const [rfqForm, setRfqForm] = useState({ company: "", email: "", garment: "", qty: 100, method: "Screen Print", colors: 4, dimensions: "", delivery: "", notes: "" });
  const [rfqGenerating, setRfqGenerating] = useState(false);
  const [orderProjectId, setOrderProjectId] = useState<number | null>(null);
  const [orderMfrId, setOrderMfrId] = useState<number | null>(null);
  const [orderQty, setOrderQty] = useState(100);

  const { data: projects = [], error: projectsError } = useListProjects();
  const { data: pricing, isLoading: pricingLoading, error: pricingError } = useGetManufacturingPricing({ quantity, printMethod });
  const { data: manufacturers = [], error: mfrsError } = useListManufacturers();
  const { data: orders = [], refetch: refetchOrders, error: ordersError } = useListOrders();
  const createOrderMutation = useCreateOrder();
  const { toast } = useToast();

  const safeProjects = projectsError ? [] : projects;
  const safeManufacturers = mfrsError ? [] : manufacturers;
  const safeOrders = ordersError ? [] : orders;

  const perUnit = pricing ? pricing.totalCogs / quantity : 0;
  const margin = retailPrice > 0 ? ((retailPrice - perUnit) / retailPrice) * 100 : 0;
  const profit = retailPrice - perUnit;

  // Parse max turnaround days from strings like "3-5 days", "14-21 days"
  function parseTurnaroundMax(str: string | null): number {
    if (!str) return 999;
    const nums = str.match(/\d+/g);
    if (!nums) return 999;
    return Math.max(...nums.map(Number));
  }

  const filteredMfrs = safeManufacturers.filter((m) => {
    const matchSearch = !mfrSearch || m.name.toLowerCase().includes(mfrSearch.toLowerCase());
    const matchType = mfrTypeFilter === "all" || m.type === mfrTypeFilter;
    const matchMoq = (m.moq ?? 0) <= moqMax;
    const matchTurnaround = parseTurnaroundMax(m.turnaround ?? null) <= turnaroundMax;
    return matchSearch && matchType && matchMoq && matchTurnaround;
  });

  async function placeOrder() {
    if (!orderProjectId || !orderMfrId) return;
    try {
      await createOrderMutation.mutateAsync({
        data: { projectId: orderProjectId, manufacturerId: orderMfrId, quantity: orderQty },
      });
      await refetchOrders();
      toast({ title: "Order placed", description: "Submitted to manufacturing queue." });
    } catch (err) {
      console.error(err);
      toast({ title: "Order failed", description: "Could not place the order.", variant: "destructive" });
    }
  }

  async function downloadRfq() {
    setRfqGenerating(true);
    try {
      const res = await fetch(getApiUrl("/manufacturing/rfq"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: rfqForm.company,
          contactEmail: rfqForm.email,
          projectName: "Custom Order",
          garmentType: rfqForm.garment,
          quantity: rfqForm.qty,
          printMethod: rfqForm.method,
          colors: rfqForm.colors,
          dimensions: rfqForm.dimensions,
          deliveryDate: rfqForm.delivery,
          notes: rfqForm.notes,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rfq.pdf";
      a.click();
      toast({ title: "RFQ downloaded", description: "Request for Quotation PDF generated." });
    } catch (err) {
      console.error(err);
      toast({ title: "RFQ failed", description: "Could not generate the PDF.", variant: "destructive" });
    } finally {
      setRfqGenerating(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manufacturing Hub</h1>
        <p className="text-muted-foreground">Pricing, sourcing, and order tracking.</p>
      </div>

      <Tabs defaultValue="cost">
        <TabsList className="flex flex-wrap gap-1 w-full h-auto min-h-[44px]">
          <TabsTrigger value="cost" className="flex items-center gap-1.5 min-h-[44px] min-w-[44px]">
            <Calculator className="w-3.5 h-3.5" />Cost
          </TabsTrigger>
          <TabsTrigger value="profit" className="flex items-center gap-1.5 min-h-[44px] min-w-[44px]">
            <TrendingUp className="w-3.5 h-3.5" />Profit
          </TabsTrigger>
          <TabsTrigger value="directory" className="flex items-center gap-1.5 min-h-[44px] min-w-[44px]">
            <Factory className="w-3.5 h-3.5" />Directory
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-1.5 min-h-[44px] min-w-[44px]">
            <ShoppingCart className="w-3.5 h-3.5" />Orders
          </TabsTrigger>
        </TabsList>

        {/* ── Cost Calculator ── */}
        <TabsContent value="cost" className="space-y-2 sm:space-y-4 mt-2 sm:mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="text-base">Configure</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Print Method</Label>
                  <Select value={printMethod} onValueChange={(v) => setPrintMethod(v as PrintMethod)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRINT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity: <span className="font-bold text-primary">{quantity} units</span></Label>
                  <div className="min-h-[44px] flex items-center">
                    <Slider min={12} max={500} step={12} value={[quantity]} onValueChange={([v]) => setQuantity(v)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Cost Breakdown</CardTitle></CardHeader>
              <CardContent>
                {pricingLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pricing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {[
                        { label: "Base Garment Cost", value: pricing.baseCost, note: `$${(pricing.baseCost / quantity).toFixed(2)}/unit` },
                        { label: "Print / Decoration", value: pricing.printingCost, note: `$${(pricing.printingCost / quantity).toFixed(2)}/unit` },
                        { label: "Shipping Estimate", value: pricing.shippingCost, note: `$${(pricing.shippingCost / quantity).toFixed(2)}/unit` },
                        { label: "Platform Fees (3%)", value: pricing.platformFees ?? 0, note: "" },
                      ].map(({ label, value, note }) => (
                        <div key={label} className="flex flex-wrap items-center justify-between py-2 border-b border-border/50">
                          <div>
                            <p className="text-sm font-medium">{label}</p>
                            {note && <p className="text-xs text-muted-foreground">{note}</p>}
                          </div>
                          <CurrencyValue value={value} />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div>
                        <p className="font-bold">Total COGS</p>
                        <p className="text-xs text-muted-foreground">${(pricing.totalCogs / quantity).toFixed(2)}/unit × {quantity} units</p>
                      </div>
                      <p className="text-xl font-bold text-primary"><CurrencyValue value={pricing.totalCogs} /></p>
                    </div>

                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <p className="text-sm font-semibold mb-2 px-4 sm:px-0">Bulk Pricing Tiers</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Price/Unit</TableHead>
                            <TableHead>Total Cost</TableHead>
                            <TableHead>Margin @ {retailPrice > 0 ? `$${retailPrice}` : "retail"}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(pricing.bulkTiers ?? []).map((tier) => (
                            <TableRow key={tier.quantity}>
                              <TableCell className="font-medium">{tier.quantity}+</TableCell>
                              <TableCell>${tier.pricePerUnit.toFixed(2)}</TableCell>
                              <TableCell>${tier.totalCost.toFixed(0)}</TableCell>
                              <TableCell>
                                <span className={cn("font-medium", (tier.marginAtRetail ?? 0) > 50 ? "text-green-500" : "text-muted-foreground")}>
                                  {tier.marginAtRetail?.toFixed(1) ?? "—"}%
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Profit Simulator ── */}
        <TabsContent value="profit" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Profit Simulator</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Print Method</Label>
                  <Select value={printMethod} onValueChange={(v) => setPrintMethod(v as PrintMethod)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRINT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity: <span className="font-bold text-primary">{quantity}</span></Label>
                  <div className="min-h-[44px] flex items-center">
                    <Slider min={12} max={500} step={12} value={[quantity]} onValueChange={([v]) => setQuantity(v)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Retail Price: <span className="font-bold text-primary">${retailPrice}</span></Label>
                  <div className="min-h-[44px] flex items-center">
                    <Slider min={5} max={200} step={1} value={[retailPrice]} onValueChange={([v]) => setRetailPrice(v)} />
                  </div>
                </div>
                {perUnit > 0 && (
                  <div className={cn("p-3 rounded-lg border text-sm", retailPrice < perUnit ? "bg-red-500/5 border-red-500/20 text-red-500" : "bg-green-500/5 border-green-500/20 text-green-600")}>
                    {retailPrice < perUnit
                      ? `⚠ Retail price ($${retailPrice}) is below cost ($${perUnit.toFixed(2)}). Raise price by $${(perUnit - retailPrice + 1).toFixed(2)}.`
                      : `✓ Minimum viable price: $${perUnit.toFixed(2)} — you're ${margin.toFixed(0)}% above break-even.`
                    }
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Cost Per Unit", value: `$${perUnit.toFixed(2)}`, sub: "COGS" },
                  { label: "Profit Per Unit", value: `$${Math.max(0, profit).toFixed(2)}`, sub: "net margin" },
                  { label: "Gross Margin", value: `${Math.max(0, margin).toFixed(1)}%`, sub: "of retail" },
                  { label: "Total Profit", value: `$${Math.max(0, profit * quantity).toFixed(0)}`, sub: `at ${quantity} units` },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-4 text-center">
                      <p className={cn("text-2xl font-bold", stat.label === "Gross Margin" && margin < 30 ? "text-orange-500" : margin < 0 ? "text-destructive" : "text-primary")}>
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                      <p className="text-xs text-muted-foreground">{stat.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Bulk margin table */}
              {pricing && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Margin by Volume</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Units</TableHead>
                          <TableHead>COGS/unit</TableHead>
                          <TableHead>Profit @ ${retailPrice}</TableHead>
                          <TableHead>Margin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(pricing.bulkTiers ?? []).map((tier) => {
                          const m = retailPrice > 0 ? ((retailPrice - tier.pricePerUnit) / retailPrice) * 100 : 0;
                          return (
                            <TableRow key={tier.quantity}>
                              <TableCell className="font-medium">{tier.quantity}+</TableCell>
                              <TableCell>${tier.pricePerUnit.toFixed(2)}</TableCell>
                              <TableCell>${(retailPrice - tier.pricePerUnit).toFixed(2)}</TableCell>
                              <TableCell>
                                <span className={cn("font-semibold", m > 50 ? "text-green-500" : m > 30 ? "text-yellow-500" : "text-red-500")}>
                                  {m.toFixed(1)}%
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Manufacturer Directory ── */}
        <TabsContent value="directory" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3 w-full">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search manufacturers…"
                className="pl-9 min-h-[44px]"
                value={mfrSearch}
                onChange={(e) => setMfrSearch(e.target.value)}
              />
            </div>
            <Select value={mfrTypeFilter} onValueChange={setMfrTypeFilter}>
              <SelectTrigger className="w-40 min-h-[44px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="pod">Print on Demand</SelectItem>
                <SelectItem value="screen_print">Screen Print</SelectItem>
                <SelectItem value="embroidery">Embroidery</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(moqMax)} onValueChange={(v) => setMoqMax(Number(v))}>
              <SelectTrigger className="w-40 min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="500">Any MOQ</SelectItem>
                <SelectItem value="1">MOQ = 1 (POD)</SelectItem>
                <SelectItem value="12">MOQ ≤ 12</SelectItem>
                <SelectItem value="48">MOQ ≤ 48</SelectItem>
                <SelectItem value="100">MOQ ≤ 100</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(turnaroundMax)} onValueChange={(v) => setTurnaroundMax(Number(v))}>
              <SelectTrigger className="w-44 min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Any turnaround</SelectItem>
                <SelectItem value="5">≤ 5 days</SelectItem>
                <SelectItem value="7">≤ 7 days</SelectItem>
                <SelectItem value="14">≤ 14 days</SelectItem>
                <SelectItem value="21">≤ 21 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(moqMax < 500 || turnaroundMax < 30) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground w-full">
              <Filter className="w-3 h-3" />
              Showing {filteredMfrs.length} of {safeManufacturers.length} manufacturers
              {moqMax < 500 && <Badge variant="secondary" className="text-xs">MOQ ≤ {moqMax}</Badge>}
              {turnaroundMax < 30 && <Badge variant="secondary" className="text-xs">≤ {turnaroundMax} days</Badge>}
              <button onClick={() => { setMoqMax(500); setTurnaroundMax(30); setMfrTypeFilter("all"); setMfrSearch(""); }} className="text-primary hover:underline ml-1 min-h-[44px] min-w-[44px]">Clear all</button>
            </div>
          )}

          {filteredMfrs.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-lg">
              <Factory className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No manufacturers yet. They'll appear here once seeded.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-x-auto">
              {filteredMfrs.map((mfr) => (
                <Card key={mfr.id} className="hover:border-primary/50 transition-colors group">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{mfr.name}</p>
                          {mfr.sustainable && <Leaf className="w-3.5 h-3.5 text-green-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{mfr.type?.replace("_", " ")}</p>
                      </div>
                      {mfr.hasApi && <Badge variant="secondary" className="text-xs">API</Badge>}
                    </div>
                    {mfr.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{mfr.rating.toFixed(1)}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div><p className="text-muted-foreground">MOQ</p><p className="font-medium">{mfr.moq ? `${mfr.moq} units` : "None"}</p></div>
                      <div><p className="text-muted-foreground">Turnaround</p><p className="font-medium">{mfr.turnaround}</p></div>
                    </div>
                    {(mfr.specialties?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {mfr.specialties?.slice(0, 3).map((s) => (
                          <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {mfr.website && (
                        <Button variant="outline" size="sm" className="flex-1 min-h-[44px] text-xs" asChild>
                          <a href={mfr.website} target="_blank" rel="noreferrer">
                            <Globe className="w-3 h-3 mr-1" />Website
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* RFQ Form */}
          <Separator />
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Download className="w-4 h-4" />Generate RFQ (Request for Quotation)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input className="min-h-[44px]" placeholder="Your company" value={rfqForm.company} onChange={(e) => setRfqForm((f) => ({ ...f, company: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input className="min-h-[44px]" placeholder="you@company.com" value={rfqForm.email} onChange={(e) => setRfqForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Garment Type</Label>
                  <Input className="min-h-[44px]" placeholder="e.g. T-shirt, Hoodie" value={rfqForm.garment} onChange={(e) => setRfqForm((f) => ({ ...f, garment: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input className="min-h-[44px]" type="number" min={1} value={rfqForm.qty} onChange={(e) => setRfqForm((f) => ({ ...f, qty: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Print Method</Label>
                  <Input className="min-h-[44px]" placeholder="Screen Print, DTG…" value={rfqForm.method} onChange={(e) => setRfqForm((f) => ({ ...f, method: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Number of Colors</Label>
                  <Input className="min-h-[44px]" type="number" min={1} max={12} value={rfqForm.colors} onChange={(e) => setRfqForm((f) => ({ ...f, colors: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Print Dimensions</Label>
                  <Input className="min-h-[44px]" placeholder='e.g. 10" × 12"' value={rfqForm.dimensions} onChange={(e) => setRfqForm((f) => ({ ...f, dimensions: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Required Delivery Date</Label>
                  <Input className="min-h-[44px]" type="date" value={rfqForm.delivery} onChange={(e) => setRfqForm((f) => ({ ...f, delivery: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea className="min-h-[44px]" placeholder="Special requirements, artwork notes, brand guidelines…" value={rfqForm.notes} onChange={(e) => setRfqForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
              <Button onClick={downloadRfq} disabled={rfqGenerating || !rfqForm.company} className="min-h-[44px]">
                {rfqGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><Download className="w-4 h-4 mr-2" />Download RFQ PDF</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Orders ── */}
        <TabsContent value="orders" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Place Order</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={orderProjectId?.toString() ?? ""} onValueChange={(v) => setOrderProjectId(Number(v))}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select project…" /></SelectTrigger>
                    <SelectContent>
                      {safeProjects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Select value={orderMfrId?.toString() ?? ""} onValueChange={(v) => setOrderMfrId(Number(v))}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select manufacturer…" /></SelectTrigger>
                    <SelectContent>
                      {safeManufacturers.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min={1} value={orderQty} onChange={(e) => setOrderQty(Number(e.target.value))} className="min-h-[44px]" />
                </div>
              </div>
              <Button
                disabled={!orderProjectId || !orderMfrId || createOrderMutation.isPending}
                onClick={placeOrder}
                className="min-h-[44px]"
              >
                {createOrderMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Placing…</>
                  : <><ShoppingCart className="w-4 h-4 mr-2" />Place Order</>}
              </Button>
            </CardContent>
          </Card>

          {safeOrders.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-lg">
              <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No orders yet.</p>
            </div>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">#{order.id}</TableCell>
                        <TableCell>P-{order.projectId}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>
                          <Badge className={cn("capitalize text-xs", STATUS_COLORS[order.status] ?? "")}>
                            {order.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.totalCost ? <CurrencyValue value={order.totalCost} /> : "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(order.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
