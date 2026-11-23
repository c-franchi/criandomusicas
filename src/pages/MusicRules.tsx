import { useTranslation } from "react-i18next";
import { ArrowLeft, Music, CheckCircle, XCircle, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
const MusicRules = () => {
  const { t: tu } = useTranslation('uiOrders');
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <SEO 
        canonical="/regras"
        title={tu('MusicRules.text001')}
        description={tu('MusicRules.text002')}
        keywords={tu('MusicRules.text003')}
      />
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {tu('MusicRules.text004')}
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
            <Music className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{tu('MusicRules.text001')}</h1>
            <p className="text-muted-foreground">{tu('MusicRules.text005')}</p>
          </div>
        </div>
        
        <div className="space-y-8">
          {/* Como funciona */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              {tu('MusicRules.text006')}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                {tu('MusicRules.text007')}
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <span className="text-3xl">1️⃣</span>
                  <h4 className="font-semibold mt-2">{tu('MusicRules.text008')}</h4>
                  <p className="text-sm">{tu('MusicRules.text009')}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <span className="text-3xl">2️⃣</span>
                  <h4 className="font-semibold mt-2">{tu('MusicRules.text010')}</h4>
                  <p className="text-sm">{tu('MusicRules.text011')}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <span className="text-3xl">3️⃣</span>
                  <h4 className="font-semibold mt-2">{tu('MusicRules.text012')}</h4>
                  <p className="text-sm">{tu('MusicRules.text013')}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* O que pode */}
          <Card className="p-6 border-green-500/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              {tu('MusicRules.text014')}
            </h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                <span><strong>{tu('MusicRules.text015')}</strong> {tu('MusicRules.text016')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                <span><strong>{tu('MusicRules.text017')}</strong> {tu('MusicRules.text018')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                <span><strong>{tu('MusicRules.text019')}</strong> {tu('MusicRules.text020')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                <span><strong>{tu('MusicRules.text021')}</strong> {tu('MusicRules.text022')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                <span><strong>{tu('MusicRules.text023')}</strong> {tu('MusicRules.text024')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                <span><strong>{tu('MusicRules.text025')}</strong> {tu('MusicRules.text026')}</span>
              </li>
            </ul>
          </Card>

          {/* O que NÃO pode */}
          <Card className="p-6 border-red-500/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-500">
              <XCircle className="w-5 h-5" />
              {tu('MusicRules.text027')}
            </h2>
            <p className="text-muted-foreground mb-4">
              {tu('MusicRules.text028')}
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                <span>{tu('MusicRules.text029')}</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                <span>{tu('MusicRules.text030')}</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                <span>{tu('MusicRules.text031')}</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                <span>{tu('MusicRules.text032')}</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                <span>{tu('MusicRules.text033')}</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                <span>{tu('MusicRules.text034')}</span>
              </li>
            </ul>
          </Card>

          {/* Dicas para um bom briefing */}
          <Card className="p-6 border-yellow-500/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="w-5 h-5" />
              {tu('MusicRules.text035')}
            </h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">💡</span>
                <span><strong>{tu('MusicRules.text036')}</strong> {tu('MusicRules.text037')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">💡</span>
                <span><strong>{tu('MusicRules.text038')}</strong> {tu('MusicRules.text039')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">💡</span>
                <span><strong>{tu('MusicRules.text040')}</strong> {tu('MusicRules.text041')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">💡</span>
                <span><strong>{tu('MusicRules.text042')}</strong> {tu('MusicRules.text043')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">💡</span>
                <span><strong>{tu('MusicRules.text044')}</strong> {tu('MusicRules.text045')}</span>
              </li>
            </ul>
          </Card>

          {/* Garantia */}
          <Card className="p-6 border-primary/30 bg-primary/5">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {tu('MusicRules.text046')}
            </h2>
            <p className="text-muted-foreground mb-4">
              {tu('MusicRules.text047')}
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-1 shrink-0" />
                <span><strong>{tu('MusicRules.text048')}</strong> {tu('MusicRules.text049')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-1 shrink-0" />
                <span><strong>{tu('MusicRules.text050')}</strong> {tu('MusicRules.text051')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-1 shrink-0" />
                <span><strong>{tu('MusicRules.text052')}</strong> {tu('MusicRules.text053')}</span>
              </li>
            </ul>
            <div className="mt-4 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-sm text-muted-foreground">
                <strong className="text-red-500">{tu('MusicRules.text054')}</strong> {tu('MusicRules.text055')} <strong>{tu('MusicRules.text056')}</strong>{tu('MusicRules.text057')}
              </p>
            </div>
          </Card>

          <div className="text-center pt-4">
            <Button asChild size="lg">
              <Link to="/briefing">
                <Music className="w-4 h-4 mr-2" />
                {tu('MusicRules.text058')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicRules;
