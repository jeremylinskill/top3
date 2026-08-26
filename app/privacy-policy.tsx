import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PolicySectionProps = {
  title: string;
  children: React.ReactNode;
};

type PolicySubsectionProps = {
  title: string;
  children: React.ReactNode;
};

type BulletListProps = {
  items: string[];
};

function PolicySection({
  title,
  children,
}: PolicySectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function PolicySubsection({
  title,
  children,
}: PolicySubsectionProps) {
  return (
    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>{title}</Text>
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

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <PageHeader
        title="Privacy Policy"
        subtitle="How Top3 handles your information."
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            Effective Date: August 25, 2026
          </Text>
          <Text style={styles.metaText}>
            Last Updated: August 26, 2026
          </Text>
        </View>

        <Paragraph>
          Top3 is a social discovery app that lets people
          create and share ranked Top 3 lists, discover
          people with similar tastes, and interact with
          other members of the Top3 community.
        </Paragraph>

        <Paragraph>
          This Privacy Policy explains what information
          Top3 collects and processes, how that information
          is used and shared, the choices available to you,
          and how you can request access to, correction of,
          or deletion of your information.
        </Paragraph>

        <Paragraph>
          Top3 is operated by Jeremy Linskill, based in
          Toronto, Ontario, Canada.
        </Paragraph>

        <Paragraph>
          If you have questions about this Privacy Policy or
          Top3&apos;s privacy practices, contact
          jeremylinskill@gmail.com.
        </Paragraph>

        <PolicySection title="1. Information We Collect and Process">
          <Paragraph>
            The information Top3 collects or processes
            depends on how you use the service.
          </Paragraph>

          <PolicySubsection title="Account and Authentication Information">
            <Paragraph>
              When you create or use a Top3 account, we
              process information necessary to create,
              authenticate, and maintain your account.
            </Paragraph>

            <BulletList
              items={[
                'Your email address.',
                'Authentication information necessary to create and maintain your account.',
                'Information provided through an authentication provider if you choose to sign in using Apple or Google.',
              ]}
            />

            <Paragraph>
              Email and password authentication is handled
              using Supabase Auth. Top3 does not itself store
              your password in its application database.
            </Paragraph>

            <Paragraph>
              If you use Sign in with Apple, Apple may
              provide Top3 with information such as your name
              and email address, depending on the information
              you choose to share and Apple&apos;s privacy
              settings. Top3 uses authentication information
              provided by Apple to authenticate your account
              through Supabase.
            </Paragraph>

            <Paragraph>
              If you use Google Sign-In, Google provides
              authentication information necessary to
              authenticate your Top3 account through
              Supabase.
            </Paragraph>

            <Paragraph>
              Top3 does not receive your Apple ID password,
              Google password, or the password for another
              third-party identity provider.
            </Paragraph>
          </PolicySubsection>

          <PolicySubsection title="Profile Information">
            <Paragraph>
              You may provide information for your Top3
              profile, including:
            </Paragraph>

            <BulletList
              items={[
                'Username.',
                'Display name.',
                'Optional biography.',
                'Optional profile image or avatar.',
                'Account visibility setting.',
              ]}
            />

            <Paragraph>
              Some profile information is intended to be
              visible to other people as part of Top3&apos;s
              social experience, subject to the privacy and
              access controls described below.
            </Paragraph>
          </PolicySubsection>

          <PolicySubsection title="Profile Images and Photo-Library Access">
            <Paragraph>
              If you choose to add or change a profile image,
              Top3 requests permission to access your
              device&apos;s photo library so that you can
              select an image.
            </Paragraph>

            <Paragraph>
              Top3 accesses the photo library when you choose
              to use a feature that requires selecting an
              image. The selected profile image is uploaded
              and stored using Top3&apos;s cloud
              infrastructure.
            </Paragraph>

            <Paragraph>
              Top3 does not currently request camera
              permission.
            </Paragraph>
          </PolicySubsection>

          <PolicySubsection title="Lists and Other Content You Create">
            <Paragraph>
              Top3 stores information you create or publish
              through the service, including:
            </Paragraph>

            <BulletList
              items={[
                'Top 3 lists.',
                'Categories and topics associated with lists.',
                'Ranked items within your lists.',
                'Comments.',
                'Other content you intentionally submit through Top3.',
              ]}
            />

            <Paragraph>
              Published lists are designed to be shared and
              discovered by other people, subject to your
              account visibility and Top3&apos;s access
              controls.
            </Paragraph>
          </PolicySubsection>

          <PolicySubsection title="Social Activity">
            <Paragraph>
              Top3 stores information about interactions
              within the service, including:
            </Paragraph>

            <BulletList
              items={[
                'Accounts you follow.',
                'Accounts that follow you.',
                'Follow requests.',
                'Likes.',
                'Comments.',
                'Blocking relationships.',
                'Interactions that generate in-app notifications.',
              ]}
            />

            <Paragraph>
              We use this information to provide Top3&apos;s
              social features and to determine what content
              and people you can see or interact with.
            </Paragraph>
          </PolicySubsection>

          <PolicySubsection title="Reports and Moderation Information">
            <Paragraph>
              If you report a user, list, comment, or other
              supported content, Top3 may collect:
            </Paragraph>

            <BulletList
              items={[
                'Your Top3 user identifier.',
                'The user associated with the reported content.',
                'The type of content being reported.',
                'The identifier of the reported content.',
                'The reason for the report.',
                'Any additional details you choose to provide.',
              ]}
            />

            <Paragraph>
              This information is used to review reports,
              enforce Top3&apos;s rules, protect users,
              investigate misuse, and maintain the safety and
              integrity of the service.
            </Paragraph>

            <Paragraph>
              Information associated with reports and
              moderation actions may be retained where
              reasonably necessary for safety, moderation,
              recordkeeping, dispute resolution, prevention
              of abuse, or legal compliance.
            </Paragraph>
          </PolicySubsection>

          <PolicySubsection title="Search Information">
            <Paragraph>
              When you search for entertainment content,
              information necessary to perform the search is
              sent to the relevant service used to retrieve
              results.
            </Paragraph>

            <Paragraph>
              Depending on the type of content, Top3
              currently uses services including:
            </Paragraph>

            <BulletList
              items={[
                'The Movie Database (TMDb) for movies and television.',
                'Google Books for books.',
                'Open Library as a book-search source or fallback.',
                'Apple Music for songs, albums, and artists.',
                'IGDB/Twitch for video games.',
              ]}
            />

            <Paragraph>
              Some provider requests are made through
              Top3&apos;s backend infrastructure rather than
              directly from your device.
            </Paragraph>

            <Paragraph>
              Search terms or other information necessary to
              retrieve results may therefore be transmitted
              to the relevant content provider or processed
              through Top3&apos;s backend services.
            </Paragraph>

            <Paragraph>
              Top3 also maintains a limited list of up to 10
              recent searches on your device to make it
              easier to return to previous searches. This
              recent-search history is stored locally on the
              device and associated locally with your Top3
              account rather than stored as part of your
              server-side Top3 profile.
            </Paragraph>
          </PolicySubsection>

          <PolicySubsection title="Media Previews and Trailers">
            <Paragraph>
              Top3 may allow you to play media associated
              with items displayed in the app.
            </Paragraph>

            <BulletList
              items={[
                'Music previews may be provided using Apple Music media.',
                'Movie and television trailers may be discovered through TMDb and played using YouTube.',
              ]}
            />

            <Paragraph>
              When you choose to play external media, your
              device may communicate with the relevant media
              provider to retrieve or play that content.
            </Paragraph>

            <Paragraph>
              Those providers may process technical
              information associated with the request
              according to their own privacy practices.
            </Paragraph>
          </PolicySubsection>

          <PolicySubsection title="Usage and Analytics Information">
            <Paragraph>
              Top3 uses product analytics to understand how
              people use the app and to improve the service.
            </Paragraph>

            <Paragraph>
              Analytics may include information about
              interactions such as:
            </Paragraph>

            <BulletList
              items={[
                'Creating an account.',
                'Completing onboarding.',
                'Starting, completing, publishing, or editing a list.',
                'Performing a search.',
                'Adding an item to a list.',
                'Viewing Discover.',
                'Viewing a profile.',
                'Following another user.',
                'Liking a collection.',
                'Adding a comment.',
                'Viewing Taste Match.',
                'Viewing or sharing a collection.',
                'Opening a notification.',
              ]}
            />

            <Paragraph>
              Analytics events may include limited contextual
              information such as the relevant category,
              source, ranking position, or number of ranked
              items.
            </Paragraph>

            <Paragraph>
              When you are signed in, analytics activity may
              be associated with your Top3 user identifier so
              that we can understand how the service is being
              used.
            </Paragraph>

            <Paragraph>
              Top3 currently uses Amplitude to provide
              product analytics.
            </Paragraph>

            <Paragraph>
              Amplitude may process a pseudonymous device
              identifier generated for analytics purposes. When
              you are signed in, Top3 also associates analytics
              activity with your Top3 user identifier.
            </Paragraph>

            <Paragraph>
              Top3 configures the Amplitude SDK not to
              collect advertising ID, IP address, carrier,
              device manufacturer, device model, language,
              operating-system name or version, or platform
              information through Amplitude&apos;s tracking
              options.
            </Paragraph>

            <Paragraph>
              Top3 uses Amplitude for product analytics
              rather than third-party advertising.
            </Paragraph>
          </PolicySubsection>

          <PolicySubsection title="Device and Local Application Information">
            <Paragraph>
              Top3 stores certain information locally on your
              device that is necessary to operate the app,
              maintain your authentication session, remember
              application state, and provide features such as
              recent searches.
            </Paragraph>

            <Paragraph>
              This may include authentication/session
              information, locally cached application data,
              and application preferences.
            </Paragraph>
          </PolicySubsection>
        </PolicySection>

        <PolicySection title="2. Information We Do Not Intentionally Collect">
          <Paragraph>
            Based on the features currently offered in Top3,
            Top3 does not intentionally collect:
          </Paragraph>

          <BulletList
            items={[
              'Precise or approximate device location.',
              'Device contacts or address-book information.',
              'Health or fitness information.',
              'Microphone recordings.',
              'Images or video captured through your device camera by Top3.',
              'Financial or payment-card information.',
              'Government identification numbers.',
              'Information for third-party targeted advertising.',
            ]}
          />

          <Paragraph>
            Top3 does not currently display third-party
            advertising.
          </Paragraph>

          <Paragraph>
            Top3 does not sell your personal information.
          </Paragraph>

          <Paragraph>
            Top3 does not use your personal information to
            track you across apps or websites owned by other
            companies for advertising purposes.
          </Paragraph>
        </PolicySection>

        <PolicySection title="3. How We Use Information">
          <Paragraph>
            We use information processed through Top3 to:
          </Paragraph>

          <BulletList
            items={[
              'Create and authenticate accounts.',
              'Maintain your account and profile.',
              'Allow you to create, edit, publish, and manage Top 3 lists.',
              'Provide search and content-discovery functionality.',
              'Retrieve content information, previews, and trailers.',
              'Operate following, likes, comments, notifications, and other social features.',
              'Provide Taste Match and other discovery experiences.',
              'Apply your public or private account settings.',
              'Process follow requests for private accounts.',
              'Enforce blocking relationships.',
              'Operate reporting and moderation tools.',
              'Detect, investigate, and prevent misuse or abuse.',
              'Maintain the security and integrity of Top3.',
              'Provide customer and privacy support.',
              'Understand how people use Top3.',
              'Diagnose problems and improve the product.',
              'Comply with applicable legal obligations.',
              'Protect the rights, safety, and security of Top3 and its users.',
            ]}
          />

          <Paragraph>
            We do not use information collected through Top3
            to build profiles for third-party targeted
            advertising.
          </Paragraph>
        </PolicySection>

        <PolicySection title="4. Public and Private Information">
          <Paragraph>
            Top3 is a social service. Some information you
            choose to provide or publish is therefore
            intended to be seen by other people.
          </Paragraph>

          <Paragraph>
            Depending on your account settings and how you
            use Top3, this may include:
          </Paragraph>

          <BulletList
            items={[
              'Username.',
              'Display name.',
              'Profile image.',
              'Biography.',
              'Published Top 3 lists.',
              'Comments.',
              'Social information surfaced by Top3.',
            ]}
          />

          <Paragraph>
            If your account is public, your profile
            information and published lists may be visible to
            other Top3 users.
          </Paragraph>

          <Paragraph>
            Published public lists may also be accessible to
            people who receive a shared link without
            requiring them to sign in, where Top3 supports
            signed-out viewing.
          </Paragraph>

          <Paragraph>
            If your account is private, access to your
            published lists is restricted according to
            Top3&apos;s private-account and approved-follower
            rules.
          </Paragraph>

          <Paragraph>
            Your profile may still appear in user search so
            that other users can find you and request to
            follow you.
          </Paragraph>

          <Paragraph>
            Blocking another user further restricts
            visibility and interaction between the accounts
            according to Top3&apos;s blocking features.
          </Paragraph>

          <Paragraph>
            You should avoid including sensitive personal
            information in your username, biography,
            comments, lists, or other content you choose to
            make visible through Top3.
          </Paragraph>
        </PolicySection>

        <PolicySection title="5. How We Share Information">
          <Paragraph>
            Top3 does not sell your personal information.
          </Paragraph>

          <Paragraph>
            Information may be disclosed where necessary to
            operate Top3, provide features you request,
            maintain the safety and security of the service,
            comply with legal obligations, or work with
            service providers that support the operation of
            Top3.
          </Paragraph>

          <PolicySubsection title="Infrastructure and Service Providers">
            <Paragraph>
              Top3 relies on third-party service providers
              for certain technical functions.
            </Paragraph>

            <Paragraph>
              Supabase is used for services including
              authentication, database functionality, cloud
              storage, realtime functionality, and backend
              infrastructure.
            </Paragraph>

            <Paragraph>
              Amplitude is used to understand product usage
              and improve Top3.
            </Paragraph>

            <Paragraph>
              Apple is used when you choose Sign in with
              Apple and for Apple platform or content
              services used by Top3.
            </Paragraph>

            <Paragraph>
              Google is used when you choose Google Sign-In
              and for services such as Google Books where
              applicable.
            </Paragraph>

            <Paragraph>
              These providers may process information
              necessary to perform the services Top3 uses.
              Their handling of information is also subject
              to their applicable terms, privacy policies,
              and data-processing practices.
            </Paragraph>
          </PolicySubsection>

          <PolicySubsection title="Content, Search, and Media Providers">
            <Paragraph>
              Top3 uses third-party services to retrieve
              information and media relating to entertainment
              and cultural content.
            </Paragraph>

            <Paragraph>
              Depending on the feature you use, a search
              query, content request, or media request may be
              transmitted to services including:
            </Paragraph>

            <BulletList
              items={[
                'TMDb.',
                'Google Books.',
                'Open Library.',
                'Apple Music.',
                'IGDB/Twitch.',
                'YouTube.',
              ]}
            />

            <Paragraph>
              Top3 does not intentionally provide these
              content providers with your Top3 password or
              your complete Top3 social profile merely to
              perform a content search or retrieve media.
            </Paragraph>
          </PolicySubsection>

          <PolicySubsection title="Other Users and People Viewing Shared Content">
            <Paragraph>
              Information you intentionally publish through
              Top3 may be visible to other users according to
              the social and privacy features of the service.
            </Paragraph>

            <Paragraph>
              Certain published public content may also be
              accessible to people who receive a shared link
              without signing in.
            </Paragraph>
          </PolicySubsection>

          <PolicySubsection title="Legal, Safety, and Security Reasons">
            <Paragraph>
              We may disclose information where reasonably
              necessary to:
            </Paragraph>

            <BulletList
              items={[
                'Comply with applicable law, regulation, legal process, or lawful government request.',
                'Investigate fraud, abuse, harassment, threats, or other misuse.',
                "Enforce Top3's rules or agreements.",
                'Protect the rights or property of Top3 or others.',
                'Protect the safety and security of users or the public.',
              ]}
            />
          </PolicySubsection>

          <PolicySubsection title="Business Changes">
            <Paragraph>
              If Top3 is transferred to a company or other
              organization in connection with a merger,
              acquisition, financing, reorganization, sale
              of assets, or similar transaction, information
              associated with the service may be transferred
              as part of that transaction, subject to
              applicable law.
            </Paragraph>
          </PolicySubsection>
        </PolicySection>

        <PolicySection title="6. Analytics">
          <Paragraph>
            Top3 uses Amplitude to understand how users
            interact with the app.
          </Paragraph>

          <Paragraph>
            Analytics help us understand which features are
            being used, whether important product flows are
            being completed, and where the product may need
            improvement.
          </Paragraph>

          <Paragraph>
            Top3&apos;s analytics implementation is intended
            for product analytics rather than advertising.
          </Paragraph>

          <Paragraph>
            Top3 does not use Amplitude to serve third-party
            targeted advertisements or to track users across
            unrelated companies&apos; apps or websites for
            advertising purposes.
          </Paragraph>

          <Paragraph>
            When you delete your Top3 account, Top3 submits a
            request to Amplitude to delete analytics
            information associated with your Top3 user
            identifier.
          </Paragraph>

          <Paragraph>
            Deletion requests processed by third-party
            services may not be completed instantaneously.
          </Paragraph>
        </PolicySection>

        <PolicySection title="7. Data Retention">
          <Paragraph>
            Top3 generally retains account-associated
            information while your account remains active and
            as needed to provide the features of the service.
          </Paragraph>

          <Paragraph>
            When you delete content or your account, Top3
            removes or requests deletion of information as
            described in this Privacy Policy and according to
            the application&apos;s implemented deletion
            processes.
          </Paragraph>

          <Paragraph>
            Some information may be retained where reasonably
            necessary for:
          </Paragraph>

          <BulletList
            items={[
              'Moderation and safety records.',
              'Security and prevention of abuse.',
              'Investigation of misuse.',
              'Dispute resolution.',
              'Compliance with legal obligations.',
              'Other legitimate operational purposes permitted by applicable law.',
            ]}
          />

          <Paragraph>
            Reported or moderated content may therefore be
            retained in limited moderation records even when
            it is no longer publicly visible through Top3.
          </Paragraph>

          <Paragraph>
            Third-party processors, backup systems, or other
            technical systems may require additional time to
            complete deletion after a deletion request is
            initiated.
          </Paragraph>

          <Paragraph>
            Top3 does not intentionally retain personal
            information longer than reasonably necessary for
            the purposes for which it is processed, subject
            to legitimate legal, safety, security,
            moderation, and operational requirements.
          </Paragraph>
        </PolicySection>

        <PolicySection title="8. Account and Data Deletion">
          <Paragraph>
            You can permanently delete your Top3 account
            using the account-deletion controls available
            within the app.
          </Paragraph>

          <Paragraph>
            The deletion flow communicates that account
            deletion is permanent.
          </Paragraph>

          <Paragraph>
            When account deletion succeeds, Top3&apos;s
            implemented deletion process is designed to
            remove the authentication account and associated
            Top3 account data according to Top3&apos;s
            database and account relationships.
          </Paragraph>

          <Paragraph>
            This includes account-associated information such
            as:
          </Paragraph>

          <BulletList
            items={[
              'Your profile.',
              'Published lists.',
              'Comments.',
              'Likes.',
              'Follows and follow relationships.',
              'Other account-associated records handled by the deletion process.',
            ]}
          />

          <Paragraph>Where applicable, Top3 also:</Paragraph>

          <BulletList
            items={[
              'Removes your stored profile image.',
              'Submits a request to Amplitude to delete analytics information associated with your Top3 user identifier.',
              'Revokes associated Sign in with Apple authorization for Apple-authenticated accounts.',
            ]}
          />

          <Paragraph>
            When account deletion succeeds, Top3 also clears
            the recent-search history stored locally for that
            Top3 account on the device used to perform the
            deletion.
          </Paragraph>

          <Paragraph>
            Some information may be retained where reasonably
            necessary for moderation records, safety and
            security, prevention of abuse, investigation of
            misuse, dispute resolution, legal obligations, or
            other legitimate purposes permitted by
            applicable law.
          </Paragraph>

          <Paragraph>
            Third-party deletion requests may require
            additional time to complete.
          </Paragraph>

          <Paragraph>
            Other cached or operating-system-managed
            information may remain temporarily until cleared
            by the application or operating system, or until
            the app is removed from the device.
          </Paragraph>

          <Paragraph>
            You may contact jeremylinskill@gmail.com if you
            have questions about deleting your account or
            personal information.
          </Paragraph>
        </PolicySection>

        <PolicySection title="9. Your Privacy Choices and Rights">
          <Paragraph>
            Depending on where you live, you may have legal
            rights concerning your personal information.
          </Paragraph>

          <Paragraph>These may include rights to:</Paragraph>

          <BulletList
            items={[
              'Request information about personal information Top3 holds about you.',
              'Request access to your personal information.',
              'Request correction of inaccurate information.',
              'Withdraw consent where processing is based on consent, subject to applicable legal restrictions.',
              'Request deletion of personal information.',
              'Object to or restrict certain uses of personal information where applicable.',
              'Make a complaint to an applicable privacy regulator.',
            ]}
          />

          <Paragraph>
            You can manage certain information directly
            within Top3, including profile information,
            account visibility, following relationships,
            blocks, and account deletion.
          </Paragraph>

          <Paragraph>
            You can change device permissions, such as
            photo-library access, through your device
            settings.
          </Paragraph>

          <Paragraph>
            To make a privacy request, contact
            jeremylinskill@gmail.com.
          </Paragraph>

          <Paragraph>
            We may need to verify your identity before
            fulfilling certain requests in order to protect
            your account and information.
          </Paragraph>
        </PolicySection>

        <PolicySection title="10. Security">
          <Paragraph>
            Top3 uses technical safeguards intended to help
            protect personal information and relies on
            established service providers for authentication,
            database infrastructure, storage, and other
            technical services.
          </Paragraph>

          <Paragraph>
            Access to Top3 data and functionality is
            controlled through the application&apos;s
            authentication, authorization, and backend
            security mechanisms.
          </Paragraph>

          <Paragraph>
            However, no internet service, application,
            transmission method, or storage system can
            guarantee absolute security.
          </Paragraph>

          <Paragraph>
            You are responsible for protecting access to your
            account and device.
          </Paragraph>

          <Paragraph>
            If you believe your Top3 account or information
            may have been compromised, please contact
            jeremylinskill@gmail.com.
          </Paragraph>
        </PolicySection>

        <PolicySection title="11. International Processing">
          <Paragraph>
            Top3 is operated from Ontario, Canada.
          </Paragraph>

          <Paragraph>
            Some third-party services used to operate Top3
            may process or store information outside Ontario
            or Canada.
          </Paragraph>

          <Paragraph>
            As a result, information processed by those
            providers may be subject to the laws of the
            jurisdictions in which they operate or process
            information, including lawful access requirements
            applicable in those jurisdictions.
          </Paragraph>

          <Paragraph>
            The specific processing locations used by
            third-party providers may change according to
            their infrastructure and service arrangements.
          </Paragraph>
        </PolicySection>

        <PolicySection title="12. Children and Teen Users">
          <Paragraph>
            Top3 is intended for users who are 13 years of
            age or older.
          </Paragraph>

          <Paragraph>
            Children under 13 are not permitted to create a
            Top3 account.
          </Paragraph>

          <Paragraph>
            Top3 is not designed or directed specifically to
            children under 13, and we do not knowingly seek
            to collect personal information from children
            under 13.
          </Paragraph>

          <Paragraph>
            Top3 does not currently collect a user&apos;s
            birthdate or perform age verification as part of
            account creation. Users are responsible for
            complying with Top3&apos;s minimum-age
            requirement.
          </Paragraph>

          <Paragraph>
            If we learn that a child under 13 has created an
            account or provided personal information through
            Top3, we may take steps to remove the account and
            associated information as appropriate.
          </Paragraph>

          <Paragraph>
            If you are a parent or guardian and believe that
            a child under 13 has provided personal
            information to Top3, please contact
            jeremylinskill@gmail.com.
          </Paragraph>

          <Paragraph>
            We recognize that teenagers may require
            additional care when making privacy decisions and
            aim to provide understandable information and
            privacy controls that allow users to make
            informed choices about their participation in
            Top3.
          </Paragraph>
        </PolicySection>

        <PolicySection title="13. Third-Party Services and Content">
          <Paragraph>
            Top3 uses and interacts with third-party services
            for authentication, infrastructure, analytics,
            content search, metadata, previews, trailers, and
            other functionality.
          </Paragraph>

          <Paragraph>
            Third-party services operate under their own
            terms and privacy policies.
          </Paragraph>

          <Paragraph>
            When you interact with functionality that
            communicates directly or indirectly with a
            third-party provider, that provider may process
            information associated with the request according
            to its own privacy practices.
          </Paragraph>

          <Paragraph>
            Top3 does not control the independent privacy
            practices of third-party services except to the
            extent a provider processes information on
            Top3&apos;s behalf under its service relationship
            with Top3.
          </Paragraph>

          <Paragraph>
            We encourage you to review the privacy policies
            of third-party services you choose to interact
            with.
          </Paragraph>
        </PolicySection>

        <PolicySection title="14. Changes to This Privacy Policy">
          <Paragraph>
            We may update this Privacy Policy as Top3
            evolves, its data practices change, or applicable
            requirements change.
          </Paragraph>

          <Paragraph>
            When we update this policy, we will update the
            Last Updated date at the top of the policy.
          </Paragraph>

          <Paragraph>
            If a change materially affects how personal
            information is collected, used, or disclosed,
            Top3 will provide additional notice or obtain
            consent where required by applicable law.
          </Paragraph>
        </PolicySection>

        <PolicySection title="15. Contact">
          <Paragraph>
            If you have questions, concerns, complaints, or
            requests concerning this Privacy Policy or your
            personal information, contact:
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
          </View>
        </PolicySection>
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
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.text,
  },

  subsection: {
    marginTop: SPACING.lg,
  },

  subsectionTitle: {
    ...TYPOGRAPHY.headline,
    marginBottom: SPACING.sm,
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