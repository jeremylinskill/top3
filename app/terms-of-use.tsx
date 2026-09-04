import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TermsSectionProps = {
  title: string;
  children: React.ReactNode;
};

type BulletListProps = {
  items: string[];
};

function TermsSection({
  title,
  children,
}: TermsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Text style={styles.body}>{children}</Text>;
}

function BulletList({ items }: BulletListProps) {
  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function TermsOfUseScreen() {
  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <PageHeader
        title="Terms of Use"
        subtitle="The terms that govern your use of Top 3."
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            Last Updated: September 3, 2026
          </Text>
        </View>

        <Paragraph>
          These Terms of Use (&quot;Terms&quot;) govern your access
          to and use of Top 3, including the Top 3 mobile
          application and related services (collectively,
          &quot;Top 3&quot; or the &quot;Service&quot;).
        </Paragraph>

        <Paragraph>
          Top 3 is operated by Jeremy Linskill in Toronto,
          Ontario, Canada (&quot;Top 3,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;).
        </Paragraph>

        <Paragraph>
          By creating an account, accessing, or using Top 3, you
          agree to these Terms. If you do not agree to these
          Terms, do not use the Service.
        </Paragraph>

        <TermsSection title="1. Eligibility">
          <Paragraph>
            You must be at least 13 years old to create or use a
            Top 3 account.
          </Paragraph>
          <Paragraph>
            If you are not legally able to enter into a binding
            agreement in your jurisdiction, you may use Top 3
            only with the involvement and consent of a parent or
            legal guardian where required by applicable law.
          </Paragraph>
          <Paragraph>
            You may not use Top 3 if applicable law prohibits you
            from receiving or using the Service.
          </Paragraph>
        </TermsSection>

        <TermsSection title="2. Your Account">
          <Paragraph>
            You are responsible for providing accurate account
            information and for maintaining the security of your
            account credentials.
          </Paragraph>
          <Paragraph>
            You are responsible for activity that occurs through
            your account, except to the extent that activity
            results from circumstances outside your reasonable
            control.
          </Paragraph>
          <Paragraph>
            You must not impersonate another person, misrepresent
            your identity, create an account for deceptive
            purposes, or use another person&apos;s account without
            authorization.
          </Paragraph>
          <Paragraph>
            If you believe your account has been compromised,
            contact Top 3 promptly.
          </Paragraph>
        </TermsSection>

        <TermsSection title="3. The Top 3 Service">
          <Paragraph>
            Top 3 is a social discovery service that allows users
            to create and share ranked Top 3 lists, discover
            lists and people with similar tastes, follow other
            users, interact through likes and comments, view
            community rankings, and use related discovery and
            recommendation features.
          </Paragraph>
          <Paragraph>
            Features may change, be added, removed, suspended, or
            discontinued as the Service evolves. We may also
            impose reasonable limits on features or access when
            necessary to operate, secure, maintain, or improve
            Top 3.
          </Paragraph>
        </TermsSection>

        <TermsSection title="4. User Content">
          <Paragraph>
            &quot;User Content&quot; means content you submit,
            create, publish, or otherwise make available through
            Top 3, including profile information, display names,
            usernames, bios, comments, ranked lists, selections,
            and other material you contribute to the Service.
          </Paragraph>
          <Paragraph>
            You retain ownership of any rights you have in your
            User Content.
          </Paragraph>
          <Paragraph>
            By submitting User Content to Top 3, you grant Top 3
            a non-exclusive, worldwide, royalty-free license to
            host, store, reproduce, display, format, distribute,
            and otherwise use that User Content only as
            reasonably necessary to operate, provide, secure,
            improve, and promote the Top 3 Service and its
            features.
          </Paragraph>
          <Paragraph>
            This license allows Top 3, for example, to display a
            published list in feeds, profiles, rankings,
            discovery features, shared links, and other parts of
            the Service.
          </Paragraph>
          <Paragraph>
            You represent that you have the rights necessary to
            submit your User Content and to grant this license.
          </Paragraph>
          <Paragraph>
            The license ends when the relevant User Content is
            deleted from Top 3, except to the extent that
            retention is reasonably necessary for backups, legal
            obligations, security, dispute resolution, or other
            legitimate operational purposes, or where content has
            been independently retained as permitted by law.
          </Paragraph>
        </TermsSection>

        <TermsSection title="5. Acceptable Use">
          <Paragraph>
            You must use Top 3 lawfully and responsibly.
          </Paragraph>
          <Paragraph>
            You may not use Top 3 to post, promote, facilitate,
            or engage in content or conduct that:
          </Paragraph>
          <BulletList
            items={[
              'Threatens, encourages, glorifies, or incites violence or serious harm.',
              'Harasses, bullies, intimidates, stalks, or targets another person for abuse.',
              'Promotes hatred, dehumanization, or violence against people based on protected characteristics.',
              'Sexually exploits or endangers minors, or contains child sexual abuse or exploitation material.',
              'Encourages suicide, self-harm, or serious harm to another person.',
              'Is pornographic or primarily intended to provide sexually explicit material.',
              'Impersonates another person or deceptively misrepresents identity or affiliation.',
              'Is fraudulent, deceptive, malicious, spam-like, or intended to manipulate the Service.',
              'Violates another person\'s privacy or unlawfully discloses personal or confidential information.',
              'Infringes copyright, trademark, publicity, privacy, or other intellectual-property or proprietary rights.',
              'Violates applicable law or encourages others to violate applicable law.',
              'Attempts to interfere with, disrupt, damage, overload, probe, reverse engineer, or gain unauthorized access to Top 3, its systems, accounts, or data, except where a restriction on reverse engineering is prohibited by applicable law.',
              'Circumvents or attempts to circumvent Top 3\'s moderation, security, access-control, account, or technical safeguards.',
            ]}
          />
          <Paragraph>
            These requirements are supplemented by the Top 3
            Community Standards, which provide additional
            guidance for user behaviour and content.
          </Paragraph>
        </TermsSection>

        <TermsSection title="6. Content Moderation, Reporting, and Blocking">
          <Paragraph>
            Top 3 may use automated and manual measures to help
            identify, restrict, review, or remove content that
            violates these Terms, the Community Standards,
            applicable law, or App Store requirements.
          </Paragraph>
          <Paragraph>
            Automated filtering is not capable of identifying
            every inappropriate or harmful use of the Service.
            The absence of an automated restriction does not mean
            content is permitted.
          </Paragraph>
          <Paragraph>
            Users may report content, comments, or accounts that
            they believe violate Top 3&apos;s rules. Top 3 may
            review reports and take appropriate action.
          </Paragraph>
          <Paragraph>
            Top 3 also provides blocking features that allow
            users to limit interactions and visibility involving
            other users.
          </Paragraph>
          <Paragraph>
            We may remove or restrict User Content, limit
            features, suspend accounts, or terminate accounts
            where we reasonably believe this is necessary to
            enforce these Terms or the Community Standards,
            protect users or the Service, comply with law,
            respond to valid legal requests, or address security
            or abuse.
          </Paragraph>
          <Paragraph>
            We are not required to preserve or restore content
            removed in accordance with these Terms.
          </Paragraph>
        </TermsSection>

        <TermsSection title="7. Intellectual Property">
          <Paragraph>
            Top 3 and its original software, interface, design,
            branding, logos, graphics, features, and other
            materials are owned by or licensed to Top 3 and are
            protected by applicable intellectual-property laws.
          </Paragraph>
          <Paragraph>
            Except for rights expressly granted under these Terms
            or applicable law, you may not copy, modify,
            distribute, sell, license, exploit, or create
            derivative works from Top 3&apos;s proprietary
            materials without permission.
          </Paragraph>
          <Paragraph>
            Top 3 may display titles, names, descriptions,
            artwork, images, ratings, metadata, previews,
            trailers, links, and other information supplied by
            third-party content providers. Ownership of that
            material remains with the applicable rights holders.
          </Paragraph>
        </TermsSection>

        <TermsSection title="8. Copyright and Other Rights">
          <Paragraph>
            You must not submit User Content that infringes
            another person&apos;s copyright or other rights.
          </Paragraph>
          <Paragraph>
            If you believe content available through Top 3
            infringes your rights, contact us with enough
            information to identify the material and explain your
            concern. We may remove or restrict material where
            appropriate and may request additional information
            needed to assess the report.
          </Paragraph>
          <Paragraph>
            Nothing in these Terms limits rights or exceptions
            available under applicable copyright law.
          </Paragraph>
        </TermsSection>

        <TermsSection title="9. Third-Party Services and Content">
          <Paragraph>
            Top 3 uses or interacts with third-party services and
            content providers to support features such as
            authentication, search, metadata, artwork, analytics,
            media previews, trailers, push notifications, and
            external links.
          </Paragraph>
          <Paragraph>
            Third-party services may have their own terms,
            privacy policies, availability rules, geographic
            restrictions, and technical requirements. Your use
            of those services may be subject to their terms.
          </Paragraph>
          <Paragraph>
            Top 3 does not control and is not responsible for the
            availability, accuracy, legality, or operation of
            third-party services or content.
          </Paragraph>
          <Paragraph>
            Third-party content displayed by Top 3 does not imply
            endorsement by Top 3.
          </Paragraph>
        </TermsSection>

        <TermsSection title="10. Privacy">
          <Paragraph>
            Our collection, use, disclosure, retention, and
            deletion of personal information are described in the
            Top 3 Privacy Policy.
          </Paragraph>
          <Paragraph>
            By using Top 3, you acknowledge that you have had an
            opportunity to review the Privacy Policy.
          </Paragraph>
        </TermsSection>

        <TermsSection title="11. Account Suspension and Termination">
          <Paragraph>
            You may stop using Top 3 at any time.
          </Paragraph>
          <Paragraph>
            You may permanently delete your Top 3 account using
            the account-deletion feature available in Settings.
            Account deletion is subject to the data-handling
            practices described in the Privacy Policy.
          </Paragraph>
          <Paragraph>
            Top 3 may suspend, restrict, or terminate access to
            the Service if we reasonably believe you have
            materially or repeatedly violated these Terms or the
            Community Standards, created risk or harm for Top 3
            or its users, or where suspension or termination is
            required by law.
          </Paragraph>
          <Paragraph>
            Where appropriate, Top 3 may take action without
            advance notice, particularly where urgent safety,
            security, legal, fraud, abuse, or platform-compliance
            concerns exist.
          </Paragraph>
        </TermsSection>

        <TermsSection title="12. Service Availability">
          <Paragraph>
            We aim to provide a reliable Service, but Top 3 may
            occasionally be unavailable, interrupted, delayed,
            changed, or affected by circumstances outside our
            control.
          </Paragraph>
          <Paragraph>
            We do not guarantee that every feature, item of
            third-party content, media preview, search result,
            recommendation, notification, or external service
            will always be available, accurate, complete, or
            error-free.
          </Paragraph>
        </TermsSection>

        <TermsSection title="13. Disclaimers">
          <Paragraph>
            To the maximum extent permitted by applicable law,
            Top 3 is provided on an &quot;as is&quot; and
            &quot;as available&quot; basis.
          </Paragraph>
          <Paragraph>
            We do not make warranties or representations that the
            Service will always be uninterrupted, secure,
            error-free, or suitable for every purpose.
          </Paragraph>
          <Paragraph>
            Nothing in these Terms excludes warranties,
            guarantees, rights, or remedies that cannot lawfully
            be excluded.
          </Paragraph>
        </TermsSection>

        <TermsSection title="14. Limitation of Liability">
          <Paragraph>
            To the maximum extent permitted by applicable law,
            Top 3 and its operator will not be liable for
            indirect, incidental, special, consequential,
            exemplary, or punitive damages arising from or
            relating to your use of, or inability to use, the
            Service.
          </Paragraph>
          <Paragraph>
            Nothing in these Terms excludes or limits liability
            where doing so would be prohibited by applicable law.
          </Paragraph>
        </TermsSection>

        <TermsSection title="15. Changes to These Terms">
          <Paragraph>
            We may update these Terms from time to time to reflect
            changes to Top 3, legal requirements, safety
            practices, or our operations.
          </Paragraph>
          <Paragraph>
            When we make changes, we will update the &quot;Last
            Updated&quot; date. Where required by law or where
            changes materially affect your rights, we will
            provide additional notice or obtain consent as
            appropriate.
          </Paragraph>
          <Paragraph>
            Your continued use of Top 3 after updated Terms take
            effect constitutes acceptance to the extent permitted
            by applicable law.
          </Paragraph>
        </TermsSection>

        <TermsSection title="16. Governing Law">
          <Paragraph>
            These Terms are governed by the laws of the Province
            of Ontario and the federal laws of Canada applicable
            there, without regard to conflict-of-law principles.
          </Paragraph>
          <Paragraph>
            Nothing in this section deprives you of mandatory
            consumer protections or other rights that apply to
            you under the laws of your jurisdiction.
          </Paragraph>
        </TermsSection>

        <TermsSection title="17. Apple App Store">
          <Paragraph>
            If you obtain Top 3 through Apple&apos;s App Store,
            your use of the application is also subject to the
            applicable Apple Media Services terms and
            Apple&apos;s Licensed Application End User License
            Agreement, except to the extent that a valid custom
            end-user license agreement applies.
          </Paragraph>
          <Paragraph>
            Apple is not responsible for providing maintenance or
            support for Top 3 except as required by applicable
            law or Apple&apos;s applicable terms.
          </Paragraph>
        </TermsSection>

        <TermsSection title="18. General">
          <Paragraph>
            If any provision of these Terms is found
            unenforceable, the remaining provisions will continue
            in effect to the extent permitted by law.
          </Paragraph>
          <Paragraph>
            Our failure to enforce a provision of these Terms
            does not waive our right to enforce it later.
          </Paragraph>
          <Paragraph>
            These Terms, together with the Privacy Policy and
            Community Standards where applicable, form the rules
            governing your use of Top 3, subject to any
            additional terms that must apply by law or through
            the platform from which you obtain the application.
          </Paragraph>
        </TermsSection>

        <TermsSection title="19. Contact">
          <Paragraph>
            Questions about these Terms, reports concerning
            rights, or other legal inquiries may be sent to:
          </Paragraph>

          <View style={styles.contact}>
            <Text style={styles.contactName}>
              Jeremy Linskill
            </Text>
            <Text style={styles.contactText}>
              Toronto, Ontario, Canada
            </Text>
            <Text style={styles.contactText}>
              jeremylinskill@gmail.com
            </Text>
            <Text style={styles.contactText}>
              jeremylinskill.com
            </Text>
          </View>
        </TermsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 48,
  },

  meta: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },

  metaText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.tertiaryText,
  },

  section: {
    marginTop: SPACING.xl,
  },

  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: SPACING.md,
    color: COLORS.text,
  },

  body: {
    marginBottom: SPACING.md,
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.secondaryText,
  },

  bulletList: {
    marginBottom: SPACING.md,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },

  bullet: {
    width: 18,
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.secondaryText,
  },

  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.secondaryText,
  },

  contact: {
    marginBottom: SPACING.md,
  },

  contactName: {
    ...TYPOGRAPHY.headline,
    marginBottom: 4,
    color: COLORS.text,
  },

  contactText: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.secondaryText,
  },
});