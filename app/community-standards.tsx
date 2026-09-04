import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type StandardsSectionProps = {
  title: string;
  children: React.ReactNode;
};

type BulletListProps = {
  items: string[];
};

function StandardsSection({
  title,
  children,
}: StandardsSectionProps) {
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

export default function CommunityStandardsScreen() {
  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <PageHeader
        title="Community Standards"
        subtitle="The rules that help keep Top 3 welcoming and useful."
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
          Top 3 is a social discovery app built around sharing
          taste, discovering recommendations, and connecting with
          people through the things they enjoy.
        </Paragraph>

        <Paragraph>
          These Community Standards explain the kinds of content
          and behaviour that are and are not allowed on Top 3.
          They apply to profiles, usernames, bios, Top 3 lists,
          comments, and other interactions through the Service.
        </Paragraph>

        <Paragraph>
          These standards work together with the Top 3 Terms of
          Use. We may take action when content or behaviour
          violates these standards, the Terms of Use, applicable
          law, or creates a meaningful risk to users or the
          Service.
        </Paragraph>

        <StandardsSection title="1. Treat People with Respect">
          <Paragraph>
            Top 3 should be a place where people can disagree
            about movies, music, books, games, television, and
            other interests without attacking one another.
          </Paragraph>

          <Paragraph>Do not:</Paragraph>

          <BulletList
            items={[
              'Harass, bully, intimidate, or repeatedly target another person.',
              'Encourage others to harass or abuse someone.',
              'Make credible threats of violence or serious harm.',
              'Use degrading or abusive language primarily intended to attack another user.',
              'Stalk another person or repeatedly attempt unwanted contact.',
            ]}
          />

          <Paragraph>
            Criticism, disagreement, jokes, and strong opinions
            are not automatically harassment. Context, severity,
            repetition, and whether behaviour targets another
            person may be considered when reviewing reports.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="2. Hate and Dehumanizing Content">
          <Paragraph>
            Do not promote hatred, violence, exclusion, or
            dehumanization against people based on protected
            characteristics such as race, ethnicity, national
            origin, religion, sex, gender, gender identity,
            sexual orientation, disability, or similar
            characteristics protected by applicable law.
          </Paragraph>

          <Paragraph>
            Content discussing hateful ideas in a critical,
            educational, historical, artistic, or entertainment
            context may be permitted when it does not itself
            promote hatred or violence.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="3. Violence and Threats">
          <Paragraph>Do not use Top 3 to:</Paragraph>

          <BulletList
            items={[
              'Make credible threats against another person or group.',
              'Encourage, celebrate, or coordinate real-world violence.',
              'Provide content primarily intended to facilitate serious violent wrongdoing.',
              'Target victims of violence or their families with harassment.',
            ]}
          />

          <Paragraph>
            Discussion of fictional violence, violent movies,
            books, games, music, television, news, history, or
            other cultural works is generally allowed. Context
            matters.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="4. Suicide and Self-Harm">
          <Paragraph>
            Do not encourage, glorify, instruct, or pressure
            another person to engage in suicide or serious
            self-harm.
          </Paragraph>

          <Paragraph>
            Supportive discussion, recovery experiences, and
            discussion of self-harm or suicide in entertainment,
            news, educational, or artistic contexts may be
            allowed when the content does not encourage harmful
            behaviour.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="5. Sexual Exploitation and Minor Safety">
          <Paragraph>
            Top 3 does not permit content or behaviour that
            sexually exploits, sexualizes, grooms, or endangers
            minors.
          </Paragraph>

          <Paragraph>Never post, request, promote, or distribute:</Paragraph>

          <BulletList
            items={[
              'Child sexual abuse or exploitation material.',
              'Sexualized content involving minors.',
              'Content intended to facilitate sexual exploitation or grooming of a minor.',
              'Threats, coercion, or blackmail involving sexual content.',
            ]}
          />

          <Paragraph>
            We may remove content, restrict accounts, preserve
            relevant information where legally appropriate, or
            report matters to appropriate authorities where
            required by law.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="6. Sexually Explicit Content">
          <Paragraph>
            Do not post pornographic material or content whose
            primary purpose is to provide sexually explicit
            imagery or descriptions.
          </Paragraph>

          <Paragraph>
            Top 3 is an entertainment discovery service, so users
            may discuss or rank movies, television shows, books,
            music, games, or other works that contain mature or
            sexual themes. References to those works are not
            automatically prohibited.
          </Paragraph>

          <Paragraph>
            Context, presentation, and the purpose of the content
            will be considered.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="7. Privacy and Personal Information">
          <Paragraph>
            Respect other people&apos;s privacy.
          </Paragraph>

          <Paragraph>Do not:</Paragraph>

          <BulletList
            items={[
              'Publish another person\'s sensitive personal information without authorization.',
              'Share passwords, authentication credentials, financial information, government identification numbers, or similarly sensitive information belonging to someone else.',
              'Use Top 3 to threaten someone with the release of private or intimate information.',
              'Attempt to obtain private information through deception, coercion, or unauthorized access.',
            ]}
          />
        </StandardsSection>

        <StandardsSection title="8. Impersonation and Deception">
          <Paragraph>
            Do not impersonate another person or organization in
            a way that is intended to deceive others.
          </Paragraph>

          <Paragraph>Do not:</Paragraph>

          <BulletList
            items={[
              'Pretend to be another real person without authorization.',
              'Misrepresent an account as officially representing a person, brand, organization, or service when it does not.',
              'Use deceptive identity information to manipulate or defraud other users.',
            ]}
          />

          <Paragraph>
            Parody, commentary, and fan accounts may be allowed
            when they are not reasonably likely to mislead people
            about who operates the account.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="9. Spam, Manipulation, and Service Abuse">
          <Paragraph>
            Do not use Top 3 in ways that interfere with genuine
            participation or the operation of the Service.
          </Paragraph>

          <Paragraph>Prohibited behaviour includes:</Paragraph>

          <BulletList
            items={[
              'Posting repetitive or unsolicited spam.',
              'Artificially manipulating likes, follows, rankings, comments, or other engagement.',
              'Using automated systems to create accounts or interactions without authorization.',
              'Attempting to bypass rate limits, moderation tools, blocks, access controls, or other safeguards.',
              'Attempting to gain unauthorized access to Top 3 accounts, systems, or data.',
              'Distributing malicious code or using the Service to facilitate fraud or abuse.',
            ]}
          />
        </StandardsSection>

        <StandardsSection title="10. Intellectual Property">
          <Paragraph>
            Respect copyright, trademark, publicity, privacy, and
            other rights belonging to creators, artists,
            publishers, companies, and other people.
          </Paragraph>

          <Paragraph>
            Do not upload or submit content when you do not have
            the right to use it.
          </Paragraph>

          <Paragraph>
            Top 3 may display metadata, artwork, titles, previews,
            trailers, and other materials supplied by third-party
            content providers. Users should not assume that
            content appearing in Top 3 is available for
            unrestricted reuse elsewhere.
          </Paragraph>

          <Paragraph>
            Rights holders may contact Top 3 regarding content
            they believe infringes their rights.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="11. Illegal or Harmful Activity">
          <Paragraph>
            Do not use Top 3 to organize, facilitate, promote, or
            materially assist illegal activity or serious harm.
          </Paragraph>

          <Paragraph>
            This includes fraud, exploitation, trafficking,
            malicious hacking, or other unlawful conduct.
          </Paragraph>

          <Paragraph>
            Discussion of illegal or controversial conduct in
            movies, books, television, music, games, journalism,
            history, or other cultural contexts is not
            automatically prohibited.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="12. Reporting Content and Users">
          <Paragraph>
            If you encounter content, comments, or accounts that
            you believe violate these Community Standards, use
            the reporting tools available in Top 3 where
            supported.
          </Paragraph>

          <Paragraph>
            Reports may include information about the reporting
            user, the reported user, the content involved, the
            reason for the report, and additional details
            provided by the reporter.
          </Paragraph>

          <Paragraph>
            Top 3 may review reports and take action where
            appropriate. Submitting a report does not guarantee
            that content or an account will be removed.
          </Paragraph>

          <Paragraph>
            Do not intentionally submit false, misleading, or
            abusive reports.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="13. Blocking">
          <Paragraph>
            Top 3 provides blocking tools to help users control
            unwanted interactions.
          </Paragraph>

          <Paragraph>
            Blocking another user restricts visibility and
            interaction between accounts according to the
            blocking features implemented in the Service.
          </Paragraph>

          <Paragraph>
            Blocking is available independently of reporting. You
            do not need to report someone in order to block them.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="14. How We Moderate">
          <Paragraph>
            Top 3 may use automated filtering and manual review to
            help identify content or behaviour that may violate
            these standards.
          </Paragraph>

          <Paragraph>
            Automated systems cannot identify every violation and
            may occasionally make mistakes. Content that passes
            an automated filter is not necessarily permitted.
          </Paragraph>

          <Paragraph>
            When reviewing content or reports, we may consider
            factors such as:
          </Paragraph>

          <BulletList
            items={[
              'The content itself.',
              'The context in which it appears.',
              'The apparent purpose of the content.',
              'The severity of the conduct.',
              'Whether behaviour is repeated.',
              'The potential risk to other users or the public.',
              'Relevant account history.',
              'Applicable legal or platform requirements.',
            ]}
          />
        </StandardsSection>

        <StandardsSection title="15. Context Matters">
          <Paragraph>
            Top 3 is built around entertainment, culture, taste,
            and opinion. Many works that people discuss or rank
            include violence, sexuality, controversial ideas,
            difficult themes, or offensive language.
          </Paragraph>

          <Paragraph>
            Mentioning, reviewing, ranking, criticizing, or
            discussing a work that contains sensitive material
            does not by itself violate these standards.
          </Paragraph>

          <Paragraph>
            We distinguish, where reasonably possible, between
            discussing a subject and using Top 3 to promote,
            target, threaten, exploit, or harm people.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="16. Enforcement">
          <Paragraph>
            Depending on the circumstances, Top 3 may:
          </Paragraph>

          <BulletList
            items={[
              'Remove or restrict content.',
              'Limit access to particular features.',
              'Restrict interactions between users.',
              'Suspend or terminate an account.',
              'Preserve information where reasonably necessary for safety, security, legal compliance, or dispute resolution.',
              'Refer matters to appropriate authorities where required by law.',
            ]}
          />

          <Paragraph>
            Enforcement decisions may take into account severity,
            context, repetition, prior violations, risk to users,
            and legal or platform requirements.
          </Paragraph>

          <Paragraph>
            Serious violations may result in immediate action.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="17. Repeated Violations">
          <Paragraph>
            Repeated violations of these Community Standards may
            result in increasingly serious restrictions,
            including suspension or termination of a Top 3
            account.
          </Paragraph>

          <Paragraph>
            Severe conduct may result in stronger action even
            without prior violations.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="18. Changes to These Standards">
          <Paragraph>
            These Community Standards may be updated as Top 3
            evolves, new safety concerns emerge, or legal and
            platform requirements change.
          </Paragraph>

          <Paragraph>
            When we update these standards, we will update the
            Last Updated date.
          </Paragraph>
        </StandardsSection>

        <StandardsSection title="19. Contact">
          <Paragraph>
            Questions about these Community Standards or concerns
            about content on Top 3 may be sent to:
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
        </StandardsSection>
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