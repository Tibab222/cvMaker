import { Language } from "@shared/profile.interface";
import useCoverLetterContext from "../CoverLetterProvider/hook";
import { i18n } from "./i18n";

const formatDateLang = {
  [Language.ENGLISH]: (date: Date) => date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  [Language.FRENCH]: (date: Date) => date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }),
};

export default function CoverLetterHeader({ lang = Language.ENGLISH }: { lang?: Language }) {
  const { profileInfo, coverLetter } = useCoverLetterContext();
  const t = i18n[lang as keyof typeof i18n];

  if (!profileInfo) return null;

  const { firstName, lastName, mail, phone, portfolio, linkedin, github } = profileInfo;
  
  const formatUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "");

  const currentDate = formatDateLang[lang](new Date());

  return (
    <div className="mb-8 text-sm text-slate-800 leading-relaxed font-sans">
      <div className="flex justify-between items-start">
        
        <div className="space-y-0.5">
          <p className="font-bold text-base text-slate-900">
            {firstName} {lastName}
          </p>
          {mail && (
            <p>
              <a href={`mailto:${mail}`} className="hover:underline">
                {mail}
              </a>
            </p>
          )}
          {phone && <p>{phone}</p>}
          
          {linkedin && (
            <p className="text-slate-600 text-xs">
              LinkedIn : {formatUrl(linkedin)}
            </p>
          )}
          {github && (
            <p className="text-slate-600 text-xs">
              GitHub : {formatUrl(github)}
            </p>
          )}
          {portfolio && (
            <p className="text-slate-600 text-xs">
              Portfolio : {formatUrl(portfolio)}
            </p>
          )}
        </div>

        {coverLetter?.companyName && (
          <div className="text-right space-y-0.5">
            <p className="font-semibold text-slate-900">
              {coverLetter.companyName}
            </p>
            {coverLetter.recipientName ? (
              <p>{t.attention} {coverLetter.recipientName}</p>
            ) : (
              <p>{t.attention} {t.hiringTeam}</p>
            )}
            {coverLetter.companyAddress && (
              <p className="text-slate-600 whitespace-pre-line">
                {coverLetter.companyAddress}
              </p>
            )}
          </div>
        )}
      </div>

      {/* DATE ET LIEU */}
      <div className="mt-6 text-right text-slate-600 italic">
        {t.doneDate} {currentDate}
      </div>

      {/* OBJET DE LA LETTRE */}
      {coverLetter?.roleName && (
        <div className="mt-6 font-bold text-slate-900">
          {t.object} {coverLetter.roleName}
        </div>
      )}
    </div>
  );
}